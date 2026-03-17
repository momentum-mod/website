import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException
} from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { TypedSql } from '@momentum/db';
import { Gamemode, LeaderboardID, LeaderboardType } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import pLimit, { LimitFunction } from 'p-limit';
import { XpSystemsService } from '../xp-systems/xp-systems.service';
import { UserCacheService } from '../users/user-cache.service';
import * as Keys from './keys';
import { ConfigService } from '@nestjs/config';
import { PagedResponseDto, RankEntryDto } from '../../dto';

@Injectable()
export class RankingService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly configService: ConfigService,
    private readonly xpSystems: XpSystemsService,
    private readonly userCache: UserCacheService
  ) {}

  private readonly logger = new Logger('Ranking Service');

  async onModuleInit() {
    const startTime = Date.now();

    await this.clearLeaderboards();

    // We're about to pull an enormous amount from Postgres, on my machine
    // 2.5s for 1.5m runs, will be far greater in future. So run as concurrently
    // as we can without exhausting the connection pool; half the pool size
    // should do.
    const limit = pLimit(
      this.configService.getOrThrow<number>('db.poolSize') / 2
    );

    void Promise.all(
      Enum.values(Gamemode).map((gamemode) =>
        this.initGamemodeLeaderboards(gamemode, limit)
      )
    ).then(() => {
      const duration = (Date.now() - startTime) / 1000;
      this.logger.log(`Leaderboards initialized in ${duration.toFixed(2)}s`);
    });
  }

  private async clearLeaderboards(): Promise<void> {
    const trackKeys = await this.valkey.keys(
      Keys.TrackLeaderboardPointsPrefix + '*'
    );

    if (trackKeys.length > 0) {
      await this.valkey.del(...trackKeys);
    }

    const gamemodeKeys = await this.valkey.keys(
      Keys.GamemodeLeaderboardPointsPrefix
    );

    if (gamemodeKeys.length > 0) {
      await this.valkey.del(...gamemodeKeys);
    }
  }

  private async initGamemodeLeaderboards(
    gamemode: Gamemode,
    limit: LimitFunction
  ): Promise<void> {
    // Prisma should generate a reasonable query for this, no need for TypedSql.
    const leaderboards: LeaderboardID[] = await this.db.leaderboard.findMany({
      where: { gamemode, type: LeaderboardType.RANKED },
      select: {
        mapID: true,
        gamemode: true,
        trackType: true,
        trackNum: true,
        style: true
      }
    });

    if (leaderboards.length === 0) {
      return;
    }

    await Promise.all(
      leaderboards.map((lb) =>
        limit(async () => {
          // Tried procedure here, no noticeable difference.
          const runs = await this.db.$queryRawTyped(
            TypedSql.getRankedRuns(
              lb.mapID,
              lb.gamemode,
              lb.trackType,
              lb.trackNum,
              lb.style
            )
          );

          if (runs.length === 0) return;

          await this.valkey.zadd(
            Keys.TrackLeaderboardPoints(lb),
            ...runs.flatMap((run) => [
              this.xpSystems.getRankXpForRank(run.rank, runs.length).rankXP,
              run.userID.toString()
            ])
          );
        })
      )
    );

    await this.valkey.zunionstore(
      Keys.GamemodeLeaderboardPoints(gamemode),
      leaderboards.length,
      ...leaderboards.map((id) => Keys.TrackLeaderboardPoints(id))
    );
  }

  // TODO: e2e tests, bleh
  async getGamemodeRanks(
    gamemode: Gamemode,
    skip: number,
    take: number,
    filter?: string,
    loggedInUserID?: number
  ): Promise<PagedResponseDto<RankEntryDto>> {
    const key = Keys.GamemodeLeaderboardPoints(gamemode);

    if (filter === 'around') {
      if (!loggedInUserID) throw new UnauthorizedException();

      // ZREVRANK returns 0-indexed position (0 = highest points), or null if
      // the user has no ranking entry for this gamemode.
      const userRank = await this.valkey.zrevrank(
        key,
        loggedInUserID.toString()
      );
      if (userRank === null)
        throw new NotFoundException('User has no ranking for this gamemode');

      // Center the window on the user's position, mirroring the leaderboard
      // 'around' logic: back up half of take from the user's 0-indexed rank.
      skip = Math.max(userRank - Math.floor(take / 2), 0);
    }

    const [totalCount, entries] = await Promise.all([
      this.valkey.zcard(key),
      this.valkey.zrevrange(key, skip, skip + take - 1, 'WITHSCORES')
    ]);

    const userIDs: number[] = [];
    for (let i = 0; i < entries.length; i += 2) {
      userIDs.push(Number(entries[i]));
    }

    const users = await this.userCache.getUsers(userIDs);

    const data = users.map((user, index) => ({
      rank: skip + index + 1,
      userID: user.id,
      rankXP: Number(entries[index * 2 + 1]),
      user
    }));

    return new PagedResponseDto(RankEntryDto, [data, totalCount]);
  }

  /**
   * Get total points for a user on specific rank leaderboard.
   *
   * Returns 0 if missing, or leaderboard doesn't exist (e.g. non-ranked
   * gamemode, or invalid track).
   */
  async getUserPointsForRun(
    userID: number,
    leaderboard: LeaderboardID
  ): Promise<number> {
    // This could also be done by passing in rank (we probably already know it),
    // using zcard then calculating XP from rank, but both ops are O(1) anyway.
    const score = this.valkey.zscore(
      Keys.TrackLeaderboardPoints(leaderboard),
      userID
    );

    return Number(score);
  }

  /**
   * Get total points for a user on multiple rank leaderboards.
   *
   * Returns 0s if missing, or leaderboard doesn't exist (e.g. non-ranked
   * gamemode, or invalid track).
   *
   * Order of returned points matches order of input leaderboardIDs.
   */
  async getUserPointsForRuns(
    userID: number,
    leaderboards: LeaderboardID[]
  ): Promise<number[]> {
    const pipeline = this.valkey.pipeline();

    for (const lb of leaderboards) {
      pipeline.zscore(Keys.TrackLeaderboardPoints(lb), userID);
    }

    const scores = await pipeline.exec();
    return scores.map(([, score]) => Number(score));
  }

  /**
   * Get total points for multiple users on specific rank leaderboard.
   *
   * Returns 0s if missing, or leaderboard doesn't exist (e.g. non-ranked
   * gamemode, or invalid track).
   *
   * Order of returned points matches order of input userIDs.
   */
  async getUsersPointsForRun(
    userIDs: number[],
    leaderboard: LeaderboardID
  ): Promise<number[]> {
    const scores = await this.valkey.zmscore(
      Keys.TrackLeaderboardPoints(leaderboard),
      ...userIDs
    );

    return scores.map(Number);
  }
}
