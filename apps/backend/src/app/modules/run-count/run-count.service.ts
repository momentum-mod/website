import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Result } from 'iovalkey';
import { LeaderboardIdentifier } from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';

declare module 'iovalkey' {
  interface RedisCommander<Context> {
    runCountIncrement(key: string, field: string): Result<number, Context>;
  }
}

/**
 * Increment a track's count only if its map is cached, so a cold map is
 * counted in full on its next read rather than starting from a partial hash.
 *
 * KEYS[1] map key
 * ARGV[1] track field
 */
const INCREMENT_LUA = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
end
return 0
`;

const PREFIX = 'runcount:';

// Bounds how long a count can be off after a fill races a run submission, or
// after runs are written without going through this service.
const TTL_SECONDS = 60 * 60;

type Track = Omit<LeaderboardIdentifier, 'mapID'>;

/**
 * Number of runs on each leaderboard, cached in Valkey so reads don't count
 * rows in Postgres.
 *
 *   runcount:<mapID>   HASH `gamemode:trackType:trackNum:style` -> run count
 *
 * A map's hash holds every leaderboard on it that has runs, and is filled from
 * Postgres on first read. Derived data: deleting a key just causes a recount.
 */
@Injectable()
export class RunCountService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService
  ) {}

  onModuleInit(): void {
    this.valkey.defineCommand('runCountIncrement', {
      lua: INCREMENT_LUA,
      numberOfKeys: 1
    });
  }

  private static key(mapID: number): string {
    return PREFIX + mapID;
  }

  static field({ gamemode, trackType, trackNum, style }: Track): string {
    return `${gamemode}:${trackType}:${trackNum}:${style}`;
  }

  /**
   * Run counts for every leaderboard on a map, keyed by
   * {@link RunCountService.field}. Leaderboards with no runs are absent.
   */
  async getMapCounts(mapID: number): Promise<Map<string, number>> {
    const key = RunCountService.key(mapID);

    const cached = await this.valkey.hgetall(key);
    const fields = Object.entries(cached);
    if (fields.length > 0)
      return new Map(fields.map(([field, count]) => [field, Number(count)]));

    const rows = await this.db.leaderboardRun.groupBy({
      by: ['gamemode', 'trackType', 'trackNum', 'style'],
      where: { mapID },
      _count: { _all: true }
    });

    const counts = new Map(
      rows.map((row) => [RunCountService.field(row), row._count._all])
    );

    if (counts.size > 0) {
      await this.valkey
        .multi()
        .del(key)
        .hset(key, counts)
        .expire(key, TTL_SECONDS)
        .exec();
    }

    return counts;
  }

  /**
   * Record a user's first completion of a leaderboard. Call *after* the DB
   * transaction that created the run has committed.
   */
  async increment(leaderboard: LeaderboardIdentifier): Promise<void> {
    await this.valkey.runCountIncrement(
      RunCountService.key(leaderboard.mapID),
      RunCountService.field(leaderboard)
    );
  }

  /**
   * Drop cached counts for maps whose runs or leaderboards were deleted. Call
   * *after* the DB transaction that deleted them has committed.
   */
  async invalidate(...mapIDs: number[]): Promise<void> {
    if (mapIDs.length === 0) return;

    await this.valkey.unlink(...mapIDs.map(RunCountService.key));
  }
}
