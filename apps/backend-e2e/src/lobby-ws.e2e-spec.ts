// noinspection DuplicatedCode

import { DbUtil, WebsocketTestClient } from '@momentum/test-utils';
import { Gamemode } from '@momentum/constants';
import { PrismaClient } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import Valkey from 'iovalkey';
import { LobbyService } from '../../backend/src/app/modules/lobby/lobby.service';

// E2E tests for the lobby tracking half of the game connection WebSocket
// gateway (lobby.update/leave/mapcounts), and the LobbyService queries built on
// the state it records.
describe('Game Connection Gateway - lobbies', () => {
  let app,
    prisma: PrismaClient,
    db: DbUtil,
    valkey: Valkey,
    wsUrl: string,
    lobbyService: LobbyService;

  let user, token: string, openClients: WebsocketTestClient[];

  const LOBBY_A = '109775241000000001';
  const LOBBY_B = '109775241000000002';

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment(undefined, { websockets: true });
    app = env.app;
    prisma = env.prisma;
    valkey = env.valkey;
    db = env.db;
    wsUrl = env.wsUrl;
    lobbyService = app.get(LobbyService);
  });

  afterAll(async () => {
    await teardownE2ETestEnvironment(app, prisma);
  });

  beforeEach(async () => {
    [user, token] = await db.createAndLoginGameUser();
    openClients = [];
  });

  afterEach(async () => {
    await Promise.all(openClients.map((c) => c.close()));
    await clearLobbies();
    await db.cleanup('user');
  });

  const connect = async (t = token) => {
    const client = await WebsocketTestClient.connect(wsUrl, t);
    openClients.push(client);
    return client;
  };

  async function clearLobbies() {
    const [, keys] = await valkey.scan(0, 'MATCH', 'lobby:*', 'COUNT', 1000);
    if (keys.length > 0) await valkey.del(...keys);
    lobbyService['mapCountsCache'].clear();
  }

  // Disconnect cleanup runs from the socket's close event, which nothing
  // awaits, so poll for its effects.
  async function waitFor(check: () => Promise<boolean>, timeoutMs = 2000) {
    const deadline = Date.now() + timeoutMs;
    while (!(await check())) {
      if (Date.now() > deadline) throw new Error('Timed out waiting');
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  describe('lobby.update', () => {
    it('should record the lobby the player is in', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });

      expect(res).toEqual({ event: 'lobby.update', data: null });
      expect(await lobbyService.getStatus(user.id)).toEqual({
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });
      expect(await lobbyService.getLobbyMembers(LOBBY_A)).toEqual([user.id]);
    });

    it('should record a custom lobby with no map', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });

      expect(res.data).toBeNull();
      expect(await lobbyService.getStatus(user.id)).toEqual({
        lobbyID: LOBBY_A,
        isMapLobby: false,
        mapID: undefined,
        gamemode: undefined
      });
    });

    it('should move the player out of their previous lobby', async () => {
      const client = await connect();

      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_B,
        isMapLobby: true,
        mapID: 11,
        gamemode: Gamemode.AHOP
      });

      expect(await lobbyService.getLobbyMembers(LOBBY_A)).toEqual([]);
      expect(await lobbyService.getLobbyMembers(LOBBY_B)).toEqual([user.id]);
      expect(
        (await lobbyService.getMapPlayerCounts(Gamemode.AHOP)).counts
      ).toEqual([{ mapID: 11, count: 1 }]);
    });

    it('should return an error for a map lobby with no map', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true
      });

      expect(res.data.error).toBeDefined();
      expect(await lobbyService.getStatus(user.id)).toBeNull();
    });

    it('should prune expired members from the sets it writes to', async () => {
      const client = await connect();
      await valkey.zadd(`lobby:members:${LOBBY_A}`, Date.now() - 1, 999);
      await valkey.zadd(`lobby:map:${Gamemode.AHOP}:10`, Date.now() - 1, 999);
      await valkey.zadd(`lobby:maps:${Gamemode.AHOP}`, Date.now() - 1, 12);

      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });

      expect(await valkey.zrange(`lobby:members:${LOBBY_A}`, 0, '-1')).toEqual([
        user.id.toString()
      ]);
      expect(
        await valkey.zrange(`lobby:map:${Gamemode.AHOP}:10`, 0, '-1')
      ).toEqual([user.id.toString()]);
      expect(
        await valkey.zrange(`lobby:maps:${Gamemode.AHOP}`, 0, '-1')
      ).toEqual(['10']);
    });

    it('should return an error for a malformed lobby ID', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('lobby.update', {
        lobbyID: 'not a steam id',
        isMapLobby: false
      });

      expect(res.data.error).toBeDefined();
      expect(await lobbyService.getStatus(user.id)).toBeNull();
    });
  });

  describe('lobby.leave', () => {
    it('should clear the player from their lobby', async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });

      const res = await client.sendAndAwait('lobby.leave');

      expect(res).toEqual({ event: 'lobby.leave', data: null });
      expect(await lobbyService.getStatus(user.id)).toBeNull();
      expect(await lobbyService.getLobbyMembers(LOBBY_A)).toEqual([]);
      expect(
        (await lobbyService.getMapPlayerCounts(Gamemode.AHOP)).counts
      ).toEqual([]);
    });
  });

  describe('disconnect', () => {
    it("should clear the player's lobby when their connection closes", async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });

      await client.close();

      await waitFor(
        async () => (await lobbyService.getStatus(user.id)) === null
      );
      expect(await lobbyService.getLobbyMembers(LOBBY_A)).toEqual([]);
    });

    it('should leave the lobby alone if another connection has taken it over', async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });

      // As if the user reconnected on another worker, whose update landed
      // before this socket's close.
      await valkey.hset(`lobby:user:${user.id}`, 'connectionID', 'other');

      await client.close();
      // Give the close handler a chance to (wrongly) run.
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(await lobbyService.getStatus(user.id)).toMatchObject({
        lobbyID: LOBBY_A
      });
    });
  });

  describe('lobby.mapcounts', () => {
    it("should count the players in each map's lobbies", async () => {
      const [, token2] = await db.createAndLoginGameUser();
      const [, token3] = await db.createAndLoginGameUser();
      const [, token4] = await db.createAndLoginGameUser();

      const statuses = [
        [
          token,
          {
            lobbyID: LOBBY_A,
            mapID: 10,
            gamemode: Gamemode.AHOP
          }
        ],
        [
          token2,
          {
            lobbyID: LOBBY_A,
            mapID: 10,
            gamemode: Gamemode.AHOP
          }
        ],
        [
          token3,
          {
            lobbyID: LOBBY_B,
            mapID: 11,
            gamemode: Gamemode.AHOP
          }
        ],
        [
          token4,
          {
            lobbyID: LOBBY_B,
            mapID: 10,
            gamemode: Gamemode.BHOP
          }
        ]
      ] as const;
      for (const [t, status] of statuses) {
        const client = await connect(t);
        await client.sendAndAwait('lobby.update', {
          ...status,
          isMapLobby: true
        });
      }

      const res = await openClients[0].sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });

      expect(res.event).toBe('lobby.mapcounts');
      expect(res.data.gamemode).toBe(Gamemode.AHOP);
      expect(res.data.counts).toHaveLength(2);
      expect(res.data.counts).toEqual(
        expect.arrayContaining([
          { mapID: 10, count: 2 },
          { mapID: 11, count: 1 }
        ])
      );
    });

    it('should not count players in custom lobbies', async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });

      const res = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });

      expect(res.data.counts).toEqual([]);
    });

    it('should not count expired entries', async () => {
      const client = await connect();
      await valkey.zadd(`lobby:maps:${Gamemode.AHOP}`, Date.now() + 60_000, 12);
      await valkey.zadd(`lobby:map:${Gamemode.AHOP}:12`, Date.now() - 1, 999);

      const res = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });

      expect(res.data.counts).toEqual([]);
    });

    it('should serve cached counts until the cache expires', async () => {
      const client = await connect();
      const status = {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      };
      await client.sendAndAwait('lobby.update', status);

      const first = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });
      expect(first.data.counts).toEqual([{ mapID: 10, count: 1 }]);

      const [, token2] = await db.createAndLoginGameUser();
      const client2 = await connect(token2);
      await client2.sendAndAwait('lobby.update', status);

      const cached = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });
      expect(cached.data.counts).toEqual([{ mapID: 10, count: 1 }]);

      lobbyService['mapCountsCache'].clear();
      const fresh = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });
      expect(fresh.data.counts).toEqual([{ mapID: 10, count: 2 }]);
    });

    it('should return an error for an invalid gamemode', async () => {
      const client = await connect();

      const res = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: 'surf'
      });

      expect(res.data.error).toBeDefined();
    });
  });

  describe('refresh', () => {
    it("should push back the expiry of this worker's statuses", async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });
      const membersKey = `lobby:members:${LOBBY_A}`;
      const before = Number(await valkey.zscore(membersKey, user.id));
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Each tick refreshes one slice of users, so run a full cycle.
      for (let i = 0; i < 12; i++) {
        await lobbyService['refreshLocalStatuses']();
      }

      expect(Number(await valkey.zscore(membersKey, user.id))).toBeGreaterThan(
        before
      );
      expect(await valkey.ttl(`lobby:user:${user.id}`)).toBeGreaterThan(0);
    });

    it('should restore statuses Valkey has lost', async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: true,
        mapID: 10,
        gamemode: Gamemode.AHOP
      });

      // As if Valkey restarted without persistence
      await clearLobbies();

      for (let i = 0; i < 12; i++) {
        await lobbyService['refreshLocalStatuses']();
      }

      expect(await lobbyService.getStatus(user.id)).toMatchObject({
        lobbyID: LOBBY_A,
        mapID: 10
      });
      expect(await lobbyService.getLobbyMembers(LOBBY_A)).toEqual([user.id]);
      const res = await client.sendAndAwait('lobby.mapcounts', {
        gamemode: Gamemode.AHOP
      });
      expect(res.data.counts).toEqual([{ mapID: 10, count: 1 }]);
    });

    it('should forget statuses another connection has taken over', async () => {
      const client = await connect();
      await client.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });

      // As if the user reconnected on another worker and reported a new lobby
      await valkey.hset(
        `lobby:user:${user.id}`,
        'connectionID',
        'other',
        'lobbyID',
        LOBBY_B
      );

      for (let i = 0; i < 12; i++) {
        await lobbyService['refreshLocalStatuses']();
      }

      expect(await lobbyService.getStatus(user.id)).toMatchObject({
        lobbyID: LOBBY_B
      });
      expect(lobbyService['localStatuses'].has(user.id)).toBe(false);
    });
  });

  describe('broadcastToLobby', () => {
    it('should message everyone else in the lobby', async () => {
      const [, token2] = await db.createAndLoginGameUser();
      const [, token3] = await db.createAndLoginGameUser();

      const sender = await connect();
      const member = await connect(token2);
      const outsider = await connect(token3);

      await sender.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });
      await member.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_A,
        isMapLobby: false
      });
      await outsider.sendAndAwait('lobby.update', {
        lobbyID: LOBBY_B,
        isMapLobby: false
      });

      const message = { event: 'lobby.test', data: { hello: 'world' } };
      await lobbyService.broadcastToLobby(LOBBY_A, message, {
        excludeUserID: user.id
      });

      expect(await member.next()).toEqual(message);
      await expect(sender.next(200)).rejects.toThrow();
      await expect(outsider.next(200)).rejects.toThrow();
    });
  });
});
