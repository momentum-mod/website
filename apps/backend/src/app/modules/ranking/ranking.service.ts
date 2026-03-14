import {
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException
} from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { TypedSql } from '@momentum/db';
import {
  Gamemode,
  GamemodeInfo,
  LeaderboardID,
  LeaderboardType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import pLimit, { LimitFunction } from 'p-limit';
import { XpSystemsService } from '../xp-systems/xp-systems.service';
import { UserCacheService } from '../users/user-cache.service';
import * as Keys from './keys';

@Injectable()
export class RankingService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly xpSystems: XpSystemsService,
    private readonly userCache: UserCacheService
  ) {}

  async onModuleInit() {
    await this.valkey.flushdb();
    console.time('leaderboard-init');
    // TODO: much pool size configurable, expose to configservice, limit
    // We're about to pull an enormous amount from Postgres, on my machine
    // 2.5s for 1.5m runs, will be far greater in future. So run as concurrently
    // as we can without exhausting the connection pool; half the pool size
    // should do.
    const limit = pLimit(5);
    void Promise.all(
      Enum.values(Gamemode).map((gamemode) =>
        this.initGamemodeLeaderboards(gamemode, limit)
      )
    ).then(() => console.timeEnd('leaderboard-init'));
  }

  async getRanks(
    gamemode: Gamemode,
    skip: number,
    take: number,
    filter?: string,
    loggedInUserID?: number
  ): Promise<
    [{ rank: number; userID: number; rankXP: number; user: object }[], number]
  > {
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

    const users = await this.userCache.getUser(userIDs);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = userIDs.map((userID, index) => ({
      rank: skip + index + 1,
      userID,
      rankXP: Number(entries[index * 2 + 1]),
      user: userMap.get(userID)
    }));

    return [data, totalCount];
  }

  private async initGamemodeLeaderboards(
    gamemode: Gamemode,
    limit: LimitFunction
  ): Promise<void> {
    const time = Date.now();

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

    let total = 0;

    await Promise.all(
      leaderboards.map((lb) =>
        limit(async () => {
          // Experimented with using a stored procedure here, but no noticeable
          // difference.
          const runs = await this.db.$queryRawTyped(
            TypedSql.getRankedRuns(
              lb.mapID,
              lb.gamemode,
              lb.trackType,
              lb.trackNum,
              lb.style
            )
          );

          const pipeline = this.valkey.pipeline();
          pipeline.zadd(
            Keys.TrackLeaderboardPoints(lb),
            ...runs.flatMap((run) => [
              this.xpSystems.getRankXpForRank(run.rank, runs.length).rankXP,
              run.userID.toString()
            ])
          );
          await pipeline.exec();

          total += runs.length;
        })
      )
    );

    const pipeline = this.valkey.pipeline();
    pipeline.zunionstore(
      Keys.GamemodeLeaderboardPoints(gamemode),
      leaderboards.length,
      ...leaderboards.map(Keys.TrackLeaderboardPoints)
    );
    await pipeline.exec();

    const gamemodelb = await this.valkey.zrevrange(
      Keys.GamemodeLeaderboardPoints(gamemode),
      0,
      -1,
      'WITHSCORES'
    );

    if (gamemodelb.length === 0) {
      return;
    }

    let str = '\n';
    str += `Gamemode ${GamemodeInfo.get(gamemode).name}: ${total} ranked runs across ${leaderboards.length} leaderboards (took ${Date.now() - time}ms)\n`;

    for (let i = 0; i < 10; i++) {
      const userID = gamemodelb[i * 2];
      const points = gamemodelb[i * 2 + 1];
      const user = await this.userCache.getUser(Number(userID));
      str += `${i + 1}. ${user.alias} (${points} points)\n`;
    }

    console.log(str);
  }
}
