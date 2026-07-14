// noinspection DuplicatedCode

import {
  DbUtil,
  NULL_ID,
  RequestUtil,
  resetKillswitches,
  RunTester,
  WebsocketTestClient
} from '@momentum/test-utils';
import {
  Gamemode,
  MapStatus,
  Role,
  Style,
  TrackType
} from '@momentum/constants';
import { PrismaClient } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import * as ReplayFile from '@momentum/formats/replay';
import Valkey from 'iovalkey';

// E2E tests for the game connection WebSocket gateway, which owns the run
// session lifecycle (create/update/invalidate/end). The HTTP run-submission
// endpoint (session/run/:id/end) is tested in session.e2e-spec.ts. Scenarios
// here mirror the run-session tests that used to live there as HTTP routes
// before the move to WebSockets.
describe('Game Connection Gateway - run sessions', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    valkey: Valkey,
    wsUrl: string,
    map;

  let user, token: string, openClients: WebsocketTestClient[];

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment(undefined, { websockets: true });
    app = env.app;
    prisma = env.prisma;
    valkey = env.valkey;
    req = env.req;
    db = env.db;
    wsUrl = env.wsUrl;

    map = await db.createMapWithFullLeaderboards(
      {
        name: ReplayFile.Stubs.ReplayHeaderStub.mapName,
        status: MapStatus.APPROVED
      },
      [Gamemode.AHOP, Gamemode.BHOP]
    );
  });

  afterAll(async () => {
    await db.cleanup('mMap');
    await teardownE2ETestEnvironment(app, prisma);
  });

  beforeEach(async () => {
    [user, token] = await db.createAndLoginGameUser();
    openClients = [];
  });

  afterEach(async () => {
    await Promise.all(openClients.map((c) => c.close()));
    await clearRunSessions();
    await db.cleanup('user');
  });

  const connect = async (t = token) => {
    const client = await WebsocketTestClient.connect(wsUrl, t);
    openClients.push(client);
    return client;
  };

  async function clearRunSessions() {
    const [, elements] = await valkey.scan(
      0,
      'MATCH',
      'runsess*',
      'COUNT',
      1000
    );
    if (elements.length > 0) await valkey.del(...elements);
  }

  async function seedSession(
    userID: number,
    {
      gamemode = Gamemode.AHOP,
      trackType,
      trackNum,
      mapID = map.id
    }: {
      gamemode?: Gamemode;
      trackType: TrackType;
      trackNum: number;
      mapID?: number;
    }
  ): Promise<number> {
    const createdAt = Date.now();
    const id = await valkey.incr('runsess:counter');
    await valkey.lpush(`runsess:id:${userID}`, id);
    await valkey.hset(`runsess:dat:${id}`, {
      userID,
      createdAt,
      mapID,
      gamemode,
      trackType,
      trackNum
    });
    await valkey.lpush(`runsess:ts:${id}`, `1,1,0,${createdAt}`);
    return id;
  }

  describe('runsession.create', () => {
    it('should create a run session and return its data', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('runsession.create', {
        mapID: map.id,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      expect(res.event).toBe('runsession.create');
      expect(res.data.error).toBeUndefined();
      expect(res.data.userID).toBe(user.id);
      expect(typeof res.data.id).toBe('number');
      expect(res.data.timestamps).toHaveLength(1);

      const stored = await valkey.hgetall(`runsess:dat:${res.data.id}`);
      expect(Number(stored.userID)).toBe(user.id);
      expect(Number(stored.mapID)).toBe(map.id);
      expect(Number(stored.trackType)).toBe(TrackType.MAIN);
      expect(Number(stored.trackNum)).toBe(1);

      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      expect(ids).toContain(res.data.id.toString());
    });

    it('should delete any existing session on the same track', async () => {
      await clearRunSessions();
      const createdAt = Date.now();

      // Main track - different trackType, should survive
      const mainID = await valkey.incr('runsess:counter');
      await valkey.lpush(`runsess:id:${user.id}`, mainID);
      await valkey.hset(`runsess:dat:${mainID}`, {
        userID: user.id,
        mapID: map.id,
        createdAt,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.STAGE,
        trackNum: 1
      });

      // Same trackType, different trackNum, should survive
      const stage1ID = await valkey.incr('runsess:counter');
      await valkey.lpush(`runsess:id:${user.id}`, stage1ID);
      await valkey.hset(`runsess:dat:${stage1ID}`, {
        userID: user.id,
        mapID: map.id,
        createdAt,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.STAGE,
        trackNum: 1
      });

      // Same trackType and trackNum, should be deleted
      const stage2ID = await valkey.incr('runsess:counter');
      await valkey.lpush(`runsess:id:${user.id}`, stage2ID);
      await valkey.hset(`runsess:dat:${stage2ID}`, {
        userID: user.id,
        mapID: map.id,
        createdAt,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.STAGE,
        trackNum: 2
      });

      const client = await connect();
      const res = await client.sendAndAwait('runsession.create', {
        mapID: map.id,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.STAGE,
        trackNum: 2
      });

      expect(res.data.error).toBeUndefined();

      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      // mainID, stage1ID and the freshly created session (stage2ID was removed)
      expect(ids).toHaveLength(3);
      expect(ids).toContain(res.data.id.toString());
      expect(ids).not.toContain(stage2ID.toString());
      expect(await valkey.exists(`runsess:dat:${stage2ID}`)).toBe(0);
    });

    it('should return an error if the leaderboard does not exist', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('runsession.create', {
        mapID: NULL_ID,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      expect(res.data.error).toBe('Leaderboard does not exist');
      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      expect(ids).toHaveLength(0);
    });

    it('should return an error if the RUN_SUBMISSION killswitch is active', async () => {
      const adminToken = await db.loginNewUser({ data: { roles: Role.ADMIN } });
      await req.patch({
        url: 'admin/killswitch',
        status: 204,
        body: { RUN_SUBMISSION: true },
        token: adminToken
      });

      const client = await connect();
      const res = await client.sendAndAwait('runsession.create', {
        mapID: map.id,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      expect(res.data.error).toBe('Run submission is currently disabled');
      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      expect(ids).toHaveLength(0);

      await resetKillswitches(req, adminToken);
    });
  });

  describe('runsession.update', () => {
    it('should append a timestamp to an existing session', async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const client = await connect();
      const res = await client.sendAndAwait('runsession.update', {
        sessionID,
        majorNum: 1,
        minorNum: 2,
        time: 510
      });

      expect(res.data).toBeNull();

      const timestamps = await valkey.lrange(`runsess:ts:${sessionID}`, 0, -1);
      expect(timestamps).toHaveLength(2);
      expect(timestamps).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/1,1,0,\d+/),
          expect.stringMatching(/1,2,510,\d+/)
        ])
      );
    });

    it("should error when updating another user's session", async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const otherToken = await db.loginNewGameUser();
      const otherClient = await connect(otherToken);
      const res = await otherClient.sendAndAwait('runsession.update', {
        sessionID,
        majorNum: 1,
        minorNum: 2,
        time: 510
      });

      expect(res.data.error).toBe('Invalid session');
    });

    it('should error when updating a non-existent session', async () => {
      const client = await connect();
      const res = await client.sendAndAwait('runsession.update', {
        sessionID: NULL_ID,
        majorNum: 1,
        minorNum: 2,
        time: 510
      });

      expect(res.data.error).toBe('Invalid session');
    });
  });

  describe('runsession.invalidate', () => {
    it('should delete the run session', async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const client = await connect();
      const res = await client.sendAndAwait('runsession.invalidate', {
        sessionID
      });

      expect(res.data).toBeNull();
      expect(await valkey.exists(`runsess:dat:${sessionID}`)).toBe(0);
      expect(await valkey.exists(`runsess:ts:${sessionID}`)).toBe(0);
      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      expect(ids).not.toContain(sessionID.toString());
    });

    it('should error when invalidating a non-existent session', async () => {
      const client = await connect();
      const res = await client.sendAndAwait('runsession.invalidate', {
        sessionID: NULL_ID
      });

      expect(res.data.error).toBe('Invalid session');
    });

    it("should error when invalidating another user's session", async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const otherToken = await db.loginNewGameUser();
      const otherClient = await connect(otherToken);
      const res = await otherClient.sendAndAwait('runsession.invalidate', {
        sessionID
      });

      expect(res.data.error).toBe('Invalid session');
      // Session should be untouched
      expect(await valkey.exists(`runsess:dat:${sessionID}`)).toBe(1);
    });
  });

  describe('runsession.end', () => {
    it('should mark the session ended and keep its data for the replay upload', async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const client = await connect();
      const res = await client.sendAndAwait('runsession.end', { sessionID });

      expect(res.data).toBeNull();

      // Data + timestamps retained (the HTTP upload still needs them)...
      const stored = await valkey.hgetall(`runsess:dat:${sessionID}`);
      expect(Number(stored.userID)).toBe(user.id);
      expect(stored.ended).toBe('1');
      expect(await valkey.exists(`runsess:ts:${sessionID}`)).toBe(1);

      // ...but a TTL is set and it's dropped from the user's active list.
      expect(await valkey.ttl(`runsess:dat:${sessionID}`)).toBeGreaterThan(0);
      const ids = await valkey.lrange(`runsess:id:${user.id}`, 0, -1);
      expect(ids).not.toContain(sessionID.toString());
    });

    it('should ack without error when the session is already gone', async () => {
      // Mirrors the upload winning the race and consuming the session first.
      const client = await connect();
      const res = await client.sendAndAwait('runsession.end', {
        sessionID: NULL_ID
      });

      expect(res.data).toBeNull();
    });

    it("should error when ending another user's session", async () => {
      const sessionID = await seedSession(user.id, {
        trackType: TrackType.MAIN,
        trackNum: 1
      });

      const otherToken = await db.loginNewGameUser();
      const otherClient = await connect(otherToken);
      const res = await otherClient.sendAndAwait('runsession.end', {
        sessionID
      });

      expect(res.data.error).toBe('Invalid session');
    });
  });

  describe('connection auth', () => {
    it('should reject a connection with no token', async () =>
      expect(WebsocketTestClient.connect(wsUrl)).rejects.toMatchObject({
        statusCode: 401
      }));

    it('should reject a connection with a non-game token', async () => {
      const webToken = await db.loginNewUser();
      await expect(
        WebsocketTestClient.connect(wsUrl, webToken)
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  // The WS runsession.end and the HTTP replay upload race; the backend must handle
  // them in either order without losing the run (see the rendezvous design).
  describe('rendezvous with the HTTP replay upload', () => {
    afterEach(async () => {
      await db.cleanup('pastRun', 'leaderboardRun');
      await prisma.mapStats.update({
        where: { mapID: map.id },
        data: { completions: 0, uniqueCompletions: 0 }
      });
    });

    const newTester = () =>
      new RunTester(req, valkey, {
        token,
        userID: user.id,
        gamemode: Gamemode.AHOP,
        trackType: TrackType.MAIN,
        trackNum: 1,
        style: Style.NORMAL,
        mapID: map.id,
        mapName: map.name,
        mapHash: map.currentVersion.bspHash,
        steamID: user.steamID,
        playerName: 'Abstract Barry'
      });

    it('should still accept the upload when runsession.end arrives first', async () => {
      const tester = newTester();
      await tester.startRun();
      await tester.doSegment([1, 1]);

      const client = await connect();
      const endRes = await client.sendAndAwait('runsession.end', {
        sessionID: tester.sessionID
      });
      expect(endRes.data).toBeNull();

      const res = await tester.endRun();
      expect(res.statusCode).toBe(200);
    });

    it('should make runsession.end a no-op when the upload arrives first', async () => {
      const tester = newTester();
      await tester.startRun();
      await tester.doSegment([1, 1]);

      const res = await tester.endRun();
      expect(res.statusCode).toBe(200);

      // Upload consumed the session, so runsession.end finds nothing and acks.
      const client = await connect();
      const endRes = await client.sendAndAwait('runsession.end', {
        sessionID: tester.sessionID
      });
      expect(endRes.data).toBeNull();
    });
  });
});
