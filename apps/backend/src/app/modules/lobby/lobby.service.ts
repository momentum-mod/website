import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { JsonValue } from 'type-fest';
import { ClientContext, Result } from 'iovalkey';
import { Gamemode, MapLobbyPlayerCount } from '@momentum/constants';
import { LobbyStatusDto } from '../../dto';
import { ValkeyService } from '../valkey/valkey.service';
import { WebsocketService } from '../websockets/websocket.service';
import { AuthenticatedWebSocket } from '../websockets/websocket.adapter';

/**
 * Tracks which Steam lobby each connected game client is in, and which map
 * they're on within it.
 *
 * Lobbies live entirely in Steam; the backend only knows what clients report
 * over the game WebSocket. That's enough to message everyone in a lobby, and to
 * count the players in each map's lobbies without relying on Steam's lobby
 * search, which doesn't reliably return every lobby.
 *
 * State is kept in Valkey so every worker sees it, but each entry is owned by
 * the connection that reported it. Closing that connection removes the entry,
 * and while it stays open its worker keeps refreshing the entry's expiry, so a
 * worker that dies without running close handlers leaves state behind for at
 * most {@link STATUS_TTL_SECONDS}.
 */
@Injectable()
export class LobbyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LobbyService.name);

  /**
   * Statuses reported by connections on this worker, which this worker is
   * responsible for refreshing.
   *
   * Always updated before writing to Valkey: all of a worker's commands share
   * one Valkey connection and so execute in the order they're sent, meaning a
   * refresh can never land after a newer write and reinstate an old status.
   */
  private readonly localStatuses = new Map<number, LocalStatus>();

  private refreshInterval?: NodeJS.Timeout;

  /** Which slice of {@link localStatuses} the next refresh tick handles. */
  private refreshBucket = 0;

  /**
   * Recent map player counts per gamemode. Every client asking gets the same
   * answer, so this stops each request costing a Valkey round trip per active
   * map. Holds the pending promise so concurrent misses share one fetch.
   */
  private readonly mapCountsCache = new Map<
    Gamemode,
    { expiresAt: number; counts: Promise<MapLobbyPlayerCount[]> }
  >();

  constructor(
    private readonly valkey: ValkeyService,
    private readonly wsService: WebsocketService
  ) {}

  onModuleInit() {
    // Sent as EVALSHA, so the script body only crosses the wire when Valkey
    // doesn't have it cached yet.
    this.valkey.defineCommand('writeLobbyStatus', {
      numberOfKeys: 1,
      lua: WRITE_STATUS_SCRIPT
    });

    this.refreshInterval = setInterval(
      () => void this.refreshLocalStatuses(),
      REFRESH_TICK_MS
    );
    this.refreshInterval.unref();
  }

  onModuleDestroy() {
    clearInterval(this.refreshInterval);
  }

  //#region Game WebSocket

  /**
   * Set the lobby the client is in, replacing whatever it reported before.
   */
  async updateStatus(
    client: AuthenticatedWebSocket,
    status: LobbyStatusDto
  ): Promise<null> {
    const { userId: userID, connectionID } = client;

    this.localStatuses.set(userID, { connectionID, status });
    await this.writeStatus(userID, connectionID, status, false);

    this.logger.debug(
      `updateStatus: (userID=${userID}, lobbyID=${status.lobbyID}, isMapLobby=${status.isMapLobby}, mapID=${status.mapID}, gamemode=${status.gamemode})`
    );
    return null;
  }

  /**
   * Clear the client's lobby, after it has left one.
   */
  async leaveLobby(client: AuthenticatedWebSocket): Promise<null> {
    const { userId: userID, connectionID } = client;

    this.localStatuses.delete(userID);
    await this.writeStatus(userID, connectionID, null, false);

    this.logger.debug(`leaveLobby: (userID=${userID})`);
    return null;
  }

  /**
   * Clear the client's lobby when its connection closes, unless another
   * connection for the same user has since taken it over.
   */
  async handleDisconnect(client: AuthenticatedWebSocket): Promise<void> {
    const { userId: userID, connectionID } = client;

    if (this.localStatuses.get(userID)?.connectionID === connectionID) {
      this.localStatuses.delete(userID);
    }

    try {
      await this.writeStatus(userID, connectionID, null, true);
    } catch (error) {
      // Nothing awaits this, and the TTL reaps the entry regardless.
      this.logger.error(
        `handleDisconnect: failed to clear lobby status (userID=${userID})`,
        error
      );
    }
  }

  /**
   * Number of players in each map's lobbies for a gamemode. Maps with nobody
   * in them are omitted.
   *
   * Cached for {@link MAP_COUNTS_CACHE_MS}, so may lag behind lobby changes by
   * up to that long.
   */
  async getMapPlayerCounts(
    gamemode: Gamemode
  ): Promise<{ gamemode: Gamemode; counts: MapLobbyPlayerCount[] }> {
    const now = Date.now();

    let cached = this.mapCountsCache.get(gamemode);
    if (!cached || cached.expiresAt <= now) {
      const entry = {
        expiresAt: now + MAP_COUNTS_CACHE_MS,
        counts: this.fetchMapPlayerCounts(gamemode, now)
      };
      // Don't keep serving a failure until the entry expires.
      entry.counts.catch(() => {
        if (this.mapCountsCache.get(gamemode) === entry) {
          this.mapCountsCache.delete(gamemode);
        }
      });
      this.mapCountsCache.set(gamemode, entry);
      cached = entry;
    }

    return { gamemode, counts: await cached.counts };
  }

  private async fetchMapPlayerCounts(
    gamemode: Gamemode,
    now: number
  ): Promise<MapLobbyPlayerCount[]> {
    const mapIDs = await this.valkey.zrangebyscore(
      activeMapsKey(gamemode),
      `(${now}`,
      '+inf'
    );
    if (mapIDs.length === 0) return [];

    const pipeline = this.valkey.pipeline();
    for (const mapID of mapIDs) {
      pipeline.zcount(mapMembersKey(gamemode, mapID), `(${now}`, '+inf');
    }
    const results = await pipeline.exec();

    return mapIDs
      .map((mapID, i) => ({
        mapID: Number(mapID),
        count: Number(results[i][1])
      }))
      .filter(({ count }) => count > 0);
  }

  //#endregion

  //#region Queries

  /**
   * The lobby a user is currently in, if they're connected and in one.
   */
  async getStatus(userID: number): Promise<LobbyStatusDto | null> {
    const stored = await this.valkey.hgetall(userKey(userID));
    if (!stored?.lobbyID) return null;

    return {
      lobbyID: stored.lobbyID,
      isMapLobby: stored.isMapLobby === '1',
      mapID: stored.mapID ? Number(stored.mapID) : undefined,
      gamemode: stored.gamemode ? Number(stored.gamemode) : undefined
    };
  }

  /**
   * IDs of every connected user in a lobby.
   */
  async getLobbyMembers(lobbyID: string): Promise<number[]> {
    const members = await this.valkey.zrangebyscore(
      lobbyMembersKey(lobbyID),
      `(${Date.now()}`,
      '+inf'
    );
    return members.map(Number);
  }

  /**
   * Send a message to every connected user in a lobby.
   */
  async broadcastToLobby(
    lobbyID: string,
    message: JsonValue,
    { excludeUserID }: { excludeUserID?: number } = {}
  ): Promise<void> {
    const recipients = (await this.getLobbyMembers(lobbyID)).filter(
      (id) => id !== excludeUserID
    );
    if (recipients.length > 0) {
      this.wsService.broadcastToUsers(recipients, message);
    }
  }

  //#endregion

  //#region Storage

  /**
   * Atomically replace a user's status (or clear it, if `status` is null),
   * moving them between the lobby/map indexes as needed.
   *
   * With `onlyIfOwner`, does nothing unless `connectionID` is the connection
   * that last wrote the user's status. Returns whether anything was written.
   */
  private async writeStatus(
    userID: number,
    connectionID: string,
    status: LobbyStatusDto | null,
    onlyIfOwner: boolean
  ): Promise<boolean> {
    const result = await this.valkey.writeLobbyStatus(
      ...writeStatusArgs(userID, connectionID, status, onlyIfOwner)
    );
    return result === 1;
  }

  /**
   * Re-write the statuses in this tick's slice of those owned by connections
   * on this worker, pushing back their expiry. Statuses another connection has
   * taken over are forgotten.
   *
   * Users are split into slices by ID so each tick sends a fraction of the
   * worker's statuses, rather than all of them landing on Valkey at once. Each
   * slice comes round once per {@link REFRESH_INTERVAL_MS}.
   */
  private async refreshLocalStatuses(): Promise<void> {
    const bucket = this.refreshBucket;
    this.refreshBucket = (bucket + 1) % REFRESH_BUCKETS;

    const entries = [...this.localStatuses].filter(
      ([userID]) => userID % REFRESH_BUCKETS === bucket
    );
    if (entries.length === 0) return;

    const pipeline = this.valkey.pipeline();
    for (const [userID, { connectionID, status }] of entries) {
      pipeline.writeLobbyStatus(
        ...writeStatusArgs(userID, connectionID, status, true)
      );
    }

    let results: [Error | null, unknown][];
    try {
      results = await pipeline.exec();
    } catch (error) {
      this.logger.error('refreshLocalStatuses: failed to refresh', error);
      return;
    }

    for (const [i, [userID, { connectionID }]] of entries.entries()) {
      const [error, written] = results[i];
      if (error) {
        this.logger.error(
          `refreshLocalStatuses: failed to refresh (userID=${userID})`,
          error
        );
      } else if (
        written !== 1 &&
        this.localStatuses.get(userID)?.connectionID === connectionID
      ) {
        this.localStatuses.delete(userID);
      }
    }
  }

  //#endregion
}

interface LocalStatus {
  connectionID: string;
  status: LobbyStatusDto;
}

//#region Valkey Keys

/**
 * How long a status survives without being refreshed. Only matters if a worker
 * dies without closing its connections; otherwise a close removes it directly.
 */
const STATUS_TTL_SECONDS = 3 * 60;

/** How often each status is refreshed. */
const REFRESH_INTERVAL_MS = 60_000;

/** How often a slice of the statuses is refreshed. */
const REFRESH_TICK_MS = 5000;

const REFRESH_BUCKETS = REFRESH_INTERVAL_MS / REFRESH_TICK_MS;

const MAP_COUNTS_CACHE_MS = 5000;

// The index sets are sorted sets scored by each entry's expiry time (ms), as
// sorted set members can't expire individually.

/** Sorted set of user IDs in a lobby. */
const LOBBY_MEMBERS_PREFIX = 'lobby:members:';
/** Sorted set of user IDs in a map's lobbies, suffixed `<gamemode>:<mapID>`. */
const MAP_MEMBERS_PREFIX = 'lobby:map:';
/** Sorted set of map IDs with anyone in their lobbies, suffixed `<gamemode>`. */
const ACTIVE_MAPS_PREFIX = 'lobby:maps:';

/** Hash of the user's lobby status, plus the connection that owns it. */
function userKey(userID: number): string {
  return `lobby:user:${userID}`;
}

function lobbyMembersKey(lobbyID: string): string {
  return LOBBY_MEMBERS_PREFIX + lobbyID;
}

function mapMembersKey(gamemode: Gamemode, mapID: number | string): string {
  return `${MAP_MEMBERS_PREFIX}${gamemode}:${mapID}`;
}

function activeMapsKey(gamemode: Gamemode): string {
  return ACTIVE_MAPS_PREFIX + gamemode;
}

function writeStatusArgs(
  userID: number,
  connectionID: string,
  status: LobbyStatusDto | null,
  onlyIfOwner: boolean
): [string, ...(string | number)[]] {
  const now = Date.now();
  return [
    userKey(userID),
    userID,
    connectionID,
    onlyIfOwner ? 1 : 0,
    status?.lobbyID ?? '',
    status?.isMapLobby ? 1 : 0,
    status?.mapID ?? '',
    status?.gamemode ?? '',
    now + STATUS_TTL_SECONDS * 1000,
    STATUS_TTL_SECONDS,
    now
  ];
}

/**
 * KEYS[1]: user key
 * ARGV: userID, connectionID, onlyIfOwner (1/0), lobbyID ('' to clear),
 *       isMapLobby (1/0), mapID (or ''), gamemode (or ''), expiresAt (ms),
 *       ttl (s), now (ms)
 *
 * Expired members are pruned from each index set it adds to. Readers already
 * ignore them, but a set that keeps being written to never expires as a whole,
 * so would otherwise hold every member that dropped out without a clean close.
 *
 * The index keys are built inside the script rather than passed in KEYS, which
 * is fine on standalone Valkey but would need changing for Valkey Cluster.
 */
const WRITE_STATUS_SCRIPT = `
local userKey = KEYS[1]
local userID, connectionID, onlyIfOwner = ARGV[1], ARGV[2], ARGV[3] == '1'
local lobbyID, isMapLobby, mapID, gamemode = ARGV[4], ARGV[5], ARGV[6], ARGV[7]
local expiresAt, ttl, now = ARGV[8], ARGV[9], ARGV[10]

local old = redis.call('HMGET', userKey, 'connectionID', 'lobbyID', 'isMapLobby', 'mapID', 'gamemode')
if onlyIfOwner and old[1] ~= connectionID then
  return 0
end

if old[2] then
  redis.call('ZREM', '${LOBBY_MEMBERS_PREFIX}' .. old[2], userID)
end
if old[3] == '1' and old[4] and old[5] then
  redis.call('ZREM', '${MAP_MEMBERS_PREFIX}' .. old[5] .. ':' .. old[4], userID)
end

redis.call('DEL', userKey)
if lobbyID == '' then
  return 1
end

redis.call('HSET', userKey, 'connectionID', connectionID, 'lobbyID', lobbyID, 'isMapLobby', isMapLobby)
if mapID ~= '' then
  redis.call('HSET', userKey, 'mapID', mapID, 'gamemode', gamemode)
end
redis.call('EXPIRE', userKey, ttl)

local membersKey = '${LOBBY_MEMBERS_PREFIX}' .. lobbyID
redis.call('ZADD', membersKey, expiresAt, userID)
redis.call('ZREMRANGEBYSCORE', membersKey, '-inf', now)
redis.call('EXPIRE', membersKey, ttl)

if isMapLobby == '1' and mapID ~= '' then
  local mapKey = '${MAP_MEMBERS_PREFIX}' .. gamemode .. ':' .. mapID
  redis.call('ZADD', mapKey, expiresAt, userID)
  redis.call('ZREMRANGEBYSCORE', mapKey, '-inf', now)
  redis.call('EXPIRE', mapKey, ttl)

  local mapsKey = '${ACTIVE_MAPS_PREFIX}' .. gamemode
  redis.call('ZADD', mapsKey, 'GT', expiresAt, mapID)
  redis.call('ZREMRANGEBYSCORE', mapsKey, '-inf', now)
  redis.call('EXPIRE', mapsKey, ttl)
end

return 1
`;

//#endregion

declare module 'iovalkey' {
  interface RedisCommander<Context extends ClientContext> {
    /** {@link WRITE_STATUS_SCRIPT}, registered in {@link LobbyService.onModuleInit}. */
    writeLobbyStatus(
      userKey: string,
      ...args: (string | number)[]
    ): Result<number, Context>;
  }
}
