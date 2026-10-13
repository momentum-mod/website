import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  arrayContaining,
  matchesExact,
  WebsocketTestClient
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import {
  ChatBanType,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  wsUrl,
  registerE2ETestFile
} from './support/e2e-environment';

// E2E tests for game clients looking up other players' chat/voice bans
// (chatbans.get), and the chatbans.update broadcast when an admin changes them.
describe('Game Connection Gateway - chat bans', () => {
  registerE2ETestFile();

  let token: string,
    target: User,
    admin: User,
    adminToken: string,
    openClients: WebsocketTestClient[];

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

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

      assert.equal(res.event, 'chatbans.get');
      assert.equal(res.data.players.length, 1);
      assert.equal(res.data.players[0].steamID, target.steamID.toString());
      assert.ok(
        matchesExact(
          res.data.players[0].bans,
          arrayContaining([
            { type: ChatBanType.CHAT, expiresAt: expiresAt.toISOString() },
            { type: ChatBanType.VOICE, expiresAt: null }
          ])
        )
      );
      assert.equal(res.data.players[0].bans.length, 2);
    });

    it('should leave out expired bans', async () => {
      await createBan(ChatBanType.CHAT, new Date(Date.now() - 1000));
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString()]
      });

      assert.deepEqual(res.data.players, [
        { steamID: target.steamID.toString(), bans: [] }
      ]);
    });

    it('should return an empty entry for players with no bans or no account', async () => {
      const client = await connect();
      const unknownSteamID = '76561190000000001';

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [target.steamID.toString(), unknownSteamID]
      });

      assert.deepEqual(res.data.players, [
        { steamID: target.steamID.toString(), bans: [] },
        { steamID: unknownSteamID, bans: [] }
      ]);
    });

    it('should return each player once', async () => {
      const client = await connect();
      const steamID = target.steamID.toString();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: [steamID, steamID]
      });

      assert.deepEqual(res.data.players, [{ steamID, bans: [] }]);
    });

    it('should return an error for an invalid Steam ID', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: ['not a steam id']
      });

      assert.notEqual(res.data.error, undefined);
    });

    it('should return an error for too many Steam IDs', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('chatbans.get', {
        steamIDs: Array.from({ length: 251 }, (_, i) =>
          (76561190000000000n + BigInt(i)).toString()
        )
      });

      assert.notEqual(res.data.error, undefined);
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
        assert.equal(msg.event, 'chatbans.update');
        assert.equal(msg.data.steamID, target.steamID.toString());
        assert.ok(
          matchesExact(
            msg.data.bans,
            arrayContaining([
              { type: ChatBanType.CHAT, expiresAt: null },
              { type: ChatBanType.VOICE, expiresAt: null }
            ])
          )
        );
        assert.equal(msg.data.bans.length, 2);
        // One message for all of a report's bans
        await assert.rejects(client.next(200));
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

      assert.deepEqual(await client.next(), {
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
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

      await assert.rejects(client.next(200));
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

      assert.deepEqual(await client.next(), {
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
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

      assert.deepEqual(await client.next(), {
        event: 'chatbans.update',
        data: {
          steamID: target.steamID.toString(),
          bans: [{ type: ChatBanType.VOICE, expiresAt: null }]
        }
      });
    });
  });
});
