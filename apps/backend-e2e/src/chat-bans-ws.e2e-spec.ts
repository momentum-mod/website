// noinspection DuplicatedCode

import { DbUtil, RequestUtil, WebsocketTestClient } from '@momentum/test-utils';
import {
  ChatBanType,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import { PrismaClient, User } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

// E2E tests for game clients looking up other players' chat/voice bans
// (chatbans.get), and the chatbans.update broadcast when an admin changes them.
describe('Game Connection Gateway - chat bans', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, wsUrl: string;

  let token: string,
    target: User,
    admin: User,
    adminToken: string,
    openClients: WebsocketTestClient[];

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment(undefined, { websockets: true });
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    wsUrl = env.wsUrl;
  });

  afterAll(async () => {
    await teardownE2ETestEnvironment(app, prisma);
  });

  beforeEach(async () => {
    [[, token], target, [admin, adminToken]] = await Promise.all([
      db.createAndLoginGameUser(),
      db.createUser(),
      db.createAndLoginUser({ data: { roles: Role.ADMIN } })
    ]);
    openClients = [];
  });

  afterEach(async () => {
    await Promise.all(openClients.map((c) => c.close()));
    await db.cleanup('chatBan', 'report', 'adminActivity', 'user');
  });

  const connect = async (t = token) => {
    const client = await WebsocketTestClient.connect(wsUrl, t);
    openClients.push(client);
    return client;
  };

  const createBan = (
    type: ChatBanType,
    expiresAt: Date | null = inAnHour(),
    targetID = target.id
  ) =>
    prisma.chatBan.create({
      data: { type, expiresAt, reason: 'secret', targetID, issuerID: admin.id }
    });

  describe('chatbans.get', () => {
    it("should return each player's active bans without reasons", async () => {
      const expiresAt = inAnHour();
      await createBan(ChatBanType.CHAT, expiresAt);
      await createBan(ChatBanType.VOICE, null);
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString()]
      });

      expect(res.event).toBe('chatbans.get');
      expect(res.data.players).toHaveLength(1);
      expect(res.data.players[0].steamID).toBe(target.steamID.toString());
      expect(res.data.players[0].revision).toBe(0);
      expect(res.data.players[0].bans).toEqual(
        expect.arrayContaining([
          { type: ChatBanType.CHAT, expiresAt: expiresAt.toISOString() },
          { type: ChatBanType.VOICE, expiresAt: null }
        ])
      );
      expect(res.data.players[0].bans).toHaveLength(2);
    });

    it('should leave out expired bans', async () => {
      await createBan(ChatBanType.CHAT, new Date(Date.now() - 1000));
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString()]
      });

      expect(res.data.players).toEqual([
        { steamID: target.steamID.toString(), revision: 0, bans: [] }
      ]);
    });

    it('should return an empty entry for players with no bans or no account', async () => {
      const client = await connect();
      const unknownSteamID = '76561190000000001';

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString(), unknownSteamID]
      });

      expect(res.data.players).toEqual([
        { steamID: target.steamID.toString(), revision: 0, bans: [] },
        { steamID: unknownSteamID, revision: 0, bans: [] }
      ]);
    });

    it('should return each player once', async () => {
      const client = await connect();
      const steamID = target.steamID.toString();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [steamID, steamID]
      });

      expect(res.data.players).toEqual([{ steamID, revision: 0, bans: [] }]);
    });

    it('should return an error for an invalid Steam ID', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: ['not a steam id']
      });

      expect(res.data.error).toBeDefined();
    });

    it('should return an error for too many Steam IDs', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: Array.from({ length: 251 }, (_, i) =>
          (76561190000000000n + BigInt(i)).toString()
        )
      });

      expect(res.data.error).toBeDefined();
    });
  });

  describe('chatbans.update', () => {
    let playerReport;

    beforeEach(async () => {
      playerReport = await prisma.report.create({
        data: {
          data: target.id,
          type: ReportType.PLAYER_REPORT,
          category: ReportCategory.INAPPROPRIATE_CONTENT,
          message: 'was mean in chat',
          resolved: false,
          submitterID: admin.id
        }
      });
    });

    it('should be sent to every client when bans are issued', async () => {
      const [, token2] = await db.createAndLoginGameUser();
      const clients = [await connect(), await connect(token2)];

      await req.patch({
        url: `admin/reports/${playerReport.id}`,
        status: 204,
        body: {
          resolved: true,
          resolutionMessage: 'banned',
          chatBans: [
            { type: ChatBanType.CHAT, reason: 'spam' },
            { type: ChatBanType.VOICE, reason: 'mic spam' }
          ]
        },
        token: adminToken
      });

      for (const client of clients) {
        const msg = await client.next();
        expect(msg.event).toBe('chatbans.update');
        expect(msg.data.steamID).toBe(target.steamID.toString());
        // Once per ban issued
        expect(msg.data.revision).toBe(2);
        expect(msg.data.bans).toEqual(
          expect.arrayContaining([
            { type: ChatBanType.CHAT, expiresAt: null },
            { type: ChatBanType.VOICE, expiresAt: null }
          ])
        );
        expect(msg.data.bans).toHaveLength(2);
        // One message for all of a report's bans
        await expect(client.next(200)).rejects.toThrow();
      }
    });

    it('should be sent when an admin issues a ban directly', async () => {
      const client = await connect();

      await req.post({
        url: 'admin/chat-bans',
        status: 201,
        body: { targetID: target.id, type: ChatBanType.VOICE },
        token: adminToken
      });

      expect(await client.next()).toEqual({
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
          revision: 1,
          bans: [{ type: ChatBanType.VOICE, expiresAt: null }]
        }
      });
    });

    it('should not be sent when resolving a report without bans', async () => {
      const client = await connect();

      await req.patch({
        url: `admin/reports/${playerReport.id}`,
        status: 204,
        body: { resolved: true, resolutionMessage: 'no action' },
        token: adminToken
      });

      await expect(client.next(200)).rejects.toThrow();
    });

    it('should be sent with the new expiry when a ban is edited', async () => {
      const ban = await createBan(ChatBanType.CHAT);
      const client = await connect();
      const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await req.patch({
        url: `admin/chat-bans/${ban.id}`,
        status: 204,
        body: { expiresAt: newExpiry.toISOString() },
        token: adminToken
      });

      expect(await client.next()).toEqual({
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
          revision: 1,
          bans: [{ type: ChatBanType.CHAT, expiresAt: newExpiry.toISOString() }]
        }
      });
    });

    it('should be sent with the remaining bans when a ban is revoked', async () => {
      const chatBan = await createBan(ChatBanType.CHAT);
      await createBan(ChatBanType.VOICE, null);
      const client = await connect();

      await req.del({
        url: `admin/chat-bans/${chatBan.id}`,
        status: 204,
        token: adminToken
      });

      expect(await client.next()).toEqual({
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
          revision: 1,
          bans: [{ type: ChatBanType.VOICE, expiresAt: null }]
        }
      });
    });

    it('should be ordered by revision when bans change at the same time', async () => {
      const client = await connect();

      // As when the profile form issues a text and a voice ban in parallel
      await Promise.all(
        [ChatBanType.CHAT, ChatBanType.VOICE].map((type) =>
          req.post({
            url: 'admin/chat-bans',
            status: 201,
            body: { targetID: target.id, type },
            token: adminToken
          })
        )
      );

      const updates = [await client.next(), await client.next()];

      // Either update may have been read after both bans were issued, but none
      // can be older than its revision says.
      for (const { data } of updates) {
        expect(data.revision).toBeGreaterThanOrEqual(1);
        expect(data.bans.length).toBeGreaterThanOrEqual(data.revision);
      }

      // Whichever order they arrived in, the highest revision has both bans, so
      // a client ignoring older revisions ends up with the full set.
      const latest = updates.reduce((a, b) =>
        b.data.revision > a.data.revision ? b : a
      );
      expect(latest.data.revision).toBe(2);
      expect(latest.data.bans).toHaveLength(2);

      // A lookup is ordered against those updates by the same revisions
      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString()]
      });
      expect(res.data.players[0].revision).toBe(2);
      expect(res.data.players[0].bans).toHaveLength(2);
    });
  });
});
