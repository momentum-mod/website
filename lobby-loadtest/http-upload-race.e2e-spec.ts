// Run session upload races, measured rather than asserted. Needs the e2e
// harness: copy into apps/backend-e2e/src to run (see README.md), and delete
// it again afterwards.
//
// The regression tests for the duplicate upload fix live in
// session.e2e-spec.ts; this logs what actually happens instead.
import {
  DbUtil,
  RequestUtil,
  RunTester,
  RunTesterProps,
  WebsocketTestClient
} from '@momentum/test-utils';
import {
  ActivityType,
  Gamemode,
  MapStatus,
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

describe('Run session upload races', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    valkey: Valkey,
    wsUrl: string,
    map;

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
      [Gamemode.AHOP]
    );
  });

  afterAll(async () => {
    await db.cleanup('pastRun', 'leaderboardRun', 'activity', 'user', 'mMap');
    await teardownE2ETestEnvironment(app, prisma);
  });

  const props = (user, token): RunTesterProps => ({
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
    playerName: 'Race Tester'
  });

  // Uploads the same session's replay twice at once, as a client retrying a
  // timed out upload would.
  const duplicateUploads = async (withExistingPB: boolean) => {
    const outcomes = [];
    for (let i = 0; i < 10; i++) {
      const [user, token] = await db.createAndLoginGameUser();
      if (withExistingPB) {
        // A slower first run, so the duplicated one below is a PB update
        await RunTester.run({
          req,
          valkey,
          props: props(user, token),
          segments: [1, 1],
          delay: 300
        });
      }
      const tester = new RunTester(req, valkey, props(user, token));
      await tester.startRun();
      await tester.doSegment([1, 1], 20);

      let second: Promise<{ statusCode: number; body: unknown }>;
      const first = await tester.endRun({
        delay: 20,
        beforeSubmit: (self) => {
          second = req.postOctetStream({
            url: `session/run/${self.sessionID}/end`,
            body: Buffer.from(self.replayBuffer),
            token
          });
        }
      });
      const secondRes = await second;

      const [stats, pastRuns, activities] = await Promise.all([
        prisma.userStats.findUnique({ where: { userID: user.id } }),
        prisma.pastRun.count({ where: { userID: user.id } }),
        prisma.activity.count({
          where: {
            userID: user.id,
            type: { in: [ActivityType.PB_ACHIEVED, ActivityType.WR_ACHIEVED] }
          }
        })
      ]);
      outcomes.push({
        statuses: [first.statusCode, secondRes.statusCode].sort().join('+'),
        runsSubmitted: stats.runsSubmitted,
        pastRuns,
        activities,
        cosXP: Number(stats.cosXP)
      });
    }
    return outcomes;
  };

  it('duplicate uploads of a first completion', async () => {
    console.log('DUPLICATE UPLOADS (first completion)', JSON.stringify(await duplicateUploads(false)));
  }, 120_000);

  it('duplicate uploads that improve a PB', async () => {
    console.log('DUPLICATE UPLOADS (PB improvement)', JSON.stringify(await duplicateUploads(true)));
  }, 120_000);

  it('runsession.end racing the upload', async () => {
    const outcomes = [];
    for (let i = 0; i < 20; i++) {
      const [user, token] = await db.createAndLoginGameUser();
      const client = await WebsocketTestClient.connect(wsUrl, token);
      const tester = new RunTester(req, valkey, props(user, token));
      await tester.startRun();
      await tester.doSegment([1, 1], 20);

      let endAck: Promise<unknown>;
      const res = await tester.endRun({
        delay: 20,
        beforeSubmit: (self) => {
          endAck = client.sendAndAwait('runsession.end', {
            sessionID: self.sessionID
          });
        }
      });
      const ack = await endAck;
      await new Promise((resolve) => setTimeout(resolve, 100));
      const leftover = await valkey.hgetall(`runsess:dat:${tester.sessionID}`);
      outcomes.push({
        upload: res.statusCode,
        endAck: JSON.stringify(ack),
        leftoverKeys: Object.keys(leftover ?? {})
      });
      await client.close();
    }
    console.log('END VS UPLOAD', JSON.stringify(outcomes));
  }, 120_000);
});
