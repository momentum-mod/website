import {
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  Gamemode,
  GamemodeStyles,
  LeaderboardIdentifier,
  LeaderboardType,
  MapStatus,
  Style,
  TrackType
} from '@momentum/constants';
import { TypedSql } from '@momentum/db';
import { getRankPoints, RANK_POINTS_VERSION } from '@momentum/xp-systems';
import { parallelLimit } from '@momentum/util-fn';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { isFirstWorker } from '../../../clustered';
import { UserCacheService } from '../user-cache/user-cache.service';
import { PagedResponseDto, RankEntryDto, UserRankDto } from '../../dto';
import {
  parseLeaderboard,
  RankPointsKeys,
  serializeLeaderboard
} from './rank-points.keys';
import { COMMIT_RANK_POINTS_LUA, RELEASE_LOCK_LUA } from './rank-points.lua';
import { Result } from 'iovalkey';

// Custom commands registered in onModuleInit via defineCommand.
declare module 'iovalkey' {
  interface RedisCommander<Context> {
    rankPointsCommit(
      numberOfKeys: number,
      ...keys: string[]
    ): Result<number, Context>;
    rankPointsReleaseLock(key: string, token: string): Result<number, Context>;
  }
}

/** How many leaderboards to stage before committing them in one batch. */
const BATCH_SIZE = 100;
/** Members per ZADD when staging very large leaderboards. */
const ZADD_CHUNK = 5000;
/** How often the worker checks the queue. */
export const RANK_POINTS_WORKER_INTERVAL_MS = 2000;
export const RANK_POINTS_WORKER_NAME = 'rank-points-worker';
/** Lock expiry. Refreshed between batches, so only needs to outlive one. */
const LOCK_TTL_MS = 60_000;

interface LeaderboardEligibility {
  type: LeaderboardType | number;
  trackType: TrackType | number;
}

/**
 * Whether runs on this leaderboard earn rank points. The map must also be
 * APPROVED; callers that have the status to hand should check it too.
 */
export function isRankPointsEligible(
  leaderboard: LeaderboardEligibility,
  mapStatus?: MapStatus
): boolean {
  return (
    leaderboard.type === LeaderboardType.RANKED &&
    leaderboard.trackType === TrackType.MAIN &&
    (mapStatus === undefined || mapStatus === MapStatus.APPROVED)
  );
}

/**
 * Rank points, stored in Valkey.
 *
 * Every RANKED main-track leaderboard on an APPROVED map has a sorted set of
 * userID -> points ("track"), and every gamemode+style has a sorted set of
 * userID -> total points ("ladder") which is the sum of its tracks.
 *
 * Updates flow through a queue: anything that changes a leaderboard's runs or
 * eligibility calls `queueLeaderboardUpdates`, and a worker on the first
 * cluster worker periodically drains the queue, recomputing each leaderboard
 * from Postgres into a staging set and then committing batches of staging sets
 * into their ladders atomically.
 *
 * All of this is derived data: `rebuildAll` regenerates it from Postgres.
 */
@Injectable()
export class RankingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Ranking Service');

  /**
   * Resolves once any in-progress rebuild (at startup, or admin-triggered) has
   * finished, so queue processing never races one.
   */
  private pendingRebuild: Promise<void> = Promise.resolve();

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly userCache: UserCacheService,
    private readonly config: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    this.valkey.defineCommand('rankPointsCommit', {
      lua: COMMIT_RANK_POINTS_LUA
    });
    this.valkey.defineCommand('rankPointsReleaseLock', {
      lua: RELEASE_LOCK_LUA,
      numberOfKeys: 1
    });

    // Only one worker drains the queue. Reads work from any worker.
    if (!isFirstWorker()) return;

    const version = await this.valkey.get(RankPointsKeys.version);
    if (version !== String(RANK_POINTS_VERSION)) {
      this.logger.log(
        `Rank points data is at version ${version ?? 'none'}, expected ${RANK_POINTS_VERSION}. Rebuilding...`
      );
      // Don't block startup on this, it can take a while on a large DB.
      void this.rebuildAll().catch((error) =>
        this.logger.error('Rank points rebuild failed', error)
      );
    }

    this.schedulerRegistry.addInterval(
      RANK_POINTS_WORKER_NAME,
      setInterval(
        () =>
          void this.processQueue().catch((error) =>
            this.logger.error('Rank points worker failed', error)
          ),
        RANK_POINTS_WORKER_INTERVAL_MS
      )
    );
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('interval', RANK_POINTS_WORKER_NAME))
      this.schedulerRegistry.deleteInterval(RANK_POINTS_WORKER_NAME);
  }

  //#region Updates

  /**
   * Mark leaderboards as needing their points recomputed. Safe to call for
   * leaderboards that turn out to be ineligible or deleted; they'll simply be
   * removed from their ladder.
   *
   * Call *after* the DB transaction that changed them has committed.
   */
  async queueLeaderboardUpdates(
    leaderboards: LeaderboardIdentifier[]
  ): Promise<void> {
    if (leaderboards.length === 0) return;

    await this.valkey.sadd(
      RankPointsKeys.queue,
      ...leaderboards.map(serializeLeaderboard)
    );
  }

  /**
   * Main-track leaderboards for a map, for queueing. Fetch *before* deleting a
   * map so the identifiers still exist, then queue after the delete.
   */
  async getMapLeaderboards(mapID: number): Promise<LeaderboardIdentifier[]> {
    return this.db.leaderboard.findMany({
      where: { mapID, trackType: TrackType.MAIN },
      select: {
        mapID: true,
        gamemode: true,
        trackType: true,
        trackNum: true,
        style: true
      }
    });
  }

  /**
   * Queue every main-track leaderboard of a map. Use after anything that can
   * change a map's status or its leaderboards' type/tier.
   */
  async queueMapUpdates(mapID: number): Promise<void> {
    await this.queueLeaderboardUpdates(await this.getMapLeaderboards(mapID));
  }

  /**
   * Drain the update queue. Returns the number of leaderboards processed, or
   * -1 if another process holds the lock.
   *
   * Runs on an interval, but can be awaited directly (e.g. in tests, or after
   * a rebuild) to process everything immediately.
   */
  async processQueue(): Promise<number> {
    await this.pendingRebuild;
    return this.drainQueue();
  }

  /**
   * Process everything in the queue. Acquires the lock unless the caller
   * already holds it and passes its token.
   */
  private async drainQueue(heldToken?: string): Promise<number> {
    const token = heldToken ?? (await this.acquireLock());
    if (!token) return -1;

    let processed = 0;
    try {
      while (true) {
        const keys: string[] = await this.valkey.spop(
          RankPointsKeys.queue,
          BATCH_SIZE
        );
        if (!keys || keys.length === 0) break;

        await this.processBatch(keys.map(parseLeaderboard));
        processed += keys.length;

        await this.valkey.pexpire(RankPointsKeys.lock, LOCK_TTL_MS);
      }
    } finally {
      if (!heldToken) await this.releaseLock(token);
    }

    if (processed > 0)
      this.logger.debug(`Updated rank points for ${processed} leaderboards`);

    return processed;
  }

  /**
   * Throw away all rank points data and regenerate it from Postgres.
   * Rebuilds are serialized; a second call waits for the first to finish.
   */
  rebuildAll(): Promise<void> {
    const rebuild = this.pendingRebuild.then(() => this.doRebuildAll());
    // Never let a failed rebuild wedge the queue.
    this.pendingRebuild = rebuild.catch(() => {
      // Logged by whoever called rebuildAll.
    });
    return rebuild;
  }

  private async doRebuildAll(): Promise<void> {
    const start = Date.now();

    const token = await this.acquireLock();
    if (!token) {
      this.logger.warn('Rank points rebuild skipped, lock is held');
      return;
    }

    try {
      await this.valkey.del(RankPointsKeys.version, RankPointsKeys.queue);
      for (const prefix of [
        RankPointsKeys.trackPrefix,
        RankPointsKeys.stagingPrefix,
        RankPointsKeys.ladderPrefix
      ]) {
        await this.deleteByPrefix(prefix);
      }

      const leaderboards = await this.db.leaderboard.findMany({
        where: {
          type: LeaderboardType.RANKED,
          trackType: TrackType.MAIN,
          mmap: { status: MapStatus.APPROVED }
        },
        select: {
          mapID: true,
          gamemode: true,
          trackType: true,
          trackNum: true,
          style: true
        }
      });

      for (let i = 0; i < leaderboards.length; i += 1000) {
        await this.queueLeaderboardUpdates(leaderboards.slice(i, i + 1000));
      }

      const processed = await this.drainQueue(token);

      await this.valkey.set(RankPointsKeys.version, RANK_POINTS_VERSION);

      this.logger.log(
        `Rebuilt rank points for ${processed} leaderboards in ${((Date.now() - start) / 1000).toFixed(2)}s`
      );
    } finally {
      await this.releaseLock(token);
    }
  }

  private async processBatch(
    leaderboards: LeaderboardIdentifier[]
  ): Promise<void> {
    // Half the DB pool, so a rebuild never starves request handling of
    // connections.
    const concurrency = Math.max(
      1,
      Math.floor(this.config.getOrThrow<number>('db.poolSize') / 2)
    );
    await parallelLimit(leaderboards, concurrency, (lb) =>
      this.stageLeaderboard(lb)
    );

    // Commits are per ladder, so group by gamemode+style.
    const byLadder = new Map<string, LeaderboardIdentifier[]>();
    for (const lb of leaderboards) {
      const key = RankPointsKeys.ladder(lb.gamemode, lb.style);
      const group = byLadder.get(key);
      if (group) group.push(lb);
      else byLadder.set(key, [lb]);
    }

    for (const [ladderKey, lbs] of byLadder) {
      await this.valkey.rankPointsCommit(
        1 + 2 * lbs.length,
        ladderKey,
        ...lbs.flatMap((lb) => [
          RankPointsKeys.track(lb),
          RankPointsKeys.staging(lb)
        ])
      );
    }
  }

  /**
   * Recompute a leaderboard's points from Postgres into its staging set. If
   * the leaderboard no longer awards points (or no longer exists), the staging
   * set is removed so the commit drops the track from the ladder.
   */
  private async stageLeaderboard(lb: LeaderboardIdentifier): Promise<void> {
    const stagingKey = RankPointsKeys.staging(lb);

    const leaderboard = await this.db.leaderboard.findUnique({
      where: { mapID_gamemode_trackType_trackNum_style: lb },
      select: {
        type: true,
        trackType: true,
        tier: true,
        mmap: { select: { status: true } }
      }
    });

    if (
      !leaderboard ||
      !isRankPointsEligible(leaderboard, leaderboard.mmap.status)
    ) {
      await this.valkey.del(stagingKey);
      return;
    }

    const runs = await this.db.$queryRawTyped(
      TypedSql.getLeaderboardRankOrder(
        lb.mapID,
        lb.gamemode,
        lb.trackType,
        lb.trackNum,
        lb.style
      )
    );

    if (runs.length === 0) {
      await this.valkey.del(stagingKey);
      return;
    }

    let tier = leaderboard.tier;
    if (tier == null) {
      // Shouldn't happen for a RANKED main track, but don't let a data issue
      // either crash the worker or silently zero a leaderboard.
      this.logger.warn(
        `Ranked leaderboard ${serializeLeaderboard(lb)} has no tier, treating as tier 1`
      );
      tier = 1;
    }

    const completions = runs.length;
    const members: Array<number | string> = [];
    for (const run of runs) {
      members.push(getRankPoints(run.rank, completions, tier), run.userID);
    }

    // Atomic DEL + ZADD so a concurrent commit never sees a half-written set.
    const multi = this.valkey.multi().del(stagingKey);
    for (let i = 0; i < members.length; i += ZADD_CHUNK * 2) {
      multi.zadd(stagingKey, ...members.slice(i, i + ZADD_CHUNK * 2));
    }
    await multi.exec();
  }

  //#endregion

  //#region Reads

  /**
   * A page of a gamemode+style ladder. With `around`, the page is centered on
   * the logged-in user's position.
   */
  async getLadder(
    gamemode: Gamemode,
    style: Style,
    skip: number,
    take: number,
    around?: { userID: number }
  ): Promise<PagedResponseDto<RankEntryDto>> {
    const ladderKey = RankPointsKeys.ladder(gamemode, style);

    if (around) {
      const position = await this.valkey.zrevrank(
        ladderKey,
        around.userID.toString()
      );

      if (position === null)
        throw new GoneException('User has no rank on this leaderboard');

      skip = Math.max(position - Math.floor(take / 2), 0);
    }

    const [[, totalCount], [, entries]] = (await this.valkey
      .pipeline()
      .zcard(ladderKey)
      .zrevrange(ladderKey, skip, skip + take - 1, 'WITHSCORES')
      .exec()) as [[null, number], [null, string[]]];

    const userIDs: number[] = [];
    const points: number[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      userIDs.push(Number(entries[i]));
      points.push(Number(entries[i + 1]));
    }

    const users = await this.userCache.getUsers(userIDs);

    const data = userIDs.map((userID, i) => ({
      rank: skip + i + 1,
      userID,
      points: points[i],
      user: users[i]
    }));

    return new PagedResponseDto(RankEntryDto, [data, totalCount]);
  }

  /**
   * A user's rank on every ladder they have points on.
   */
  async getUserRanks(userID: number): Promise<UserRankDto[]> {
    if (!(await this.userCache.exists(userID)))
      throw new NotFoundException('User not found');

    const ladders: Array<[Gamemode, Style]> = [];
    for (const [gamemode, styles] of GamemodeStyles) {
      for (const style of styles) ladders.push([gamemode, style]);
    }

    const pipeline = this.valkey.pipeline();
    const member = userID.toString();
    for (const [gamemode, style] of ladders) {
      const key = RankPointsKeys.ladder(gamemode, style);
      pipeline.zrevrank(key, member).zscore(key, member).zcard(key);
    }
    const results = await pipeline.exec();

    const ranks: UserRankDto[] = [];
    for (const [i, [gamemode, style]] of ladders.entries()) {
      const position = results[i * 3][1] as number | null;
      if (position === null) continue;

      ranks.push({
        gamemode,
        style,
        rank: position + 1,
        points: Number(results[i * 3 + 1][1]),
        totalPlayers: results[i * 3 + 2][1] as number
      });
    }

    return ranks;
  }

  /**
   * Committed points for several users' runs on one leaderboard. `undefined`
   * where the user has no points there (including when the leaderboard
   * doesn't award points at all).
   */
  async getTrackPoints(
    leaderboard: LeaderboardIdentifier,
    userIDs: number[]
  ): Promise<Array<number | undefined>> {
    if (userIDs.length === 0) return [];

    const scores = await this.valkey.zmscore(
      RankPointsKeys.track(leaderboard),
      ...userIDs.map(String)
    );

    return scores.map((score) => (score === null ? undefined : Number(score)));
  }

  /**
   * Committed points for one user across several leaderboards, in input order.
   */
  async getUserTrackPoints(
    userID: number,
    leaderboards: LeaderboardIdentifier[]
  ): Promise<Array<number | undefined>> {
    if (leaderboards.length === 0) return [];

    const pipeline = this.valkey.pipeline();
    const member = userID.toString();
    for (const lb of leaderboards) {
      pipeline.zscore(RankPointsKeys.track(lb), member);
    }
    const results = await pipeline.exec();

    return results.map(([, score]) =>
      score === null ? undefined : Number(score)
    );
  }

  //#endregion

  //#region Locking and housekeeping

  private async acquireLock(): Promise<string | null> {
    const token = randomUUID();
    const result = await this.valkey.set(
      RankPointsKeys.lock,
      token,
      'PX',
      LOCK_TTL_MS,
      'NX'
    );
    return result === 'OK' ? token : null;
  }

  private async releaseLock(token: string): Promise<void> {
    await this.valkey.rankPointsReleaseLock(RankPointsKeys.lock, token);
  }

  private async deleteByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.valkey.scan(
        cursor,
        'MATCH',
        `${prefix}*`,
        'COUNT',
        1000
      );
      cursor = next;
      if (keys.length > 0) await this.valkey.unlink(...keys);
    } while (cursor !== '0');
  }

  //#endregion
}
