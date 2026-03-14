import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
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
import * as Keys from './keys';

@Injectable()
export class RankingService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly xpSystems: XpSystemsService
  ) {}

  async onModuleInit() {
    console.time('leaderboard-init');
    // TODO: much pool size configurable, expose to configservice, limit
    // We're about to pull an enormous amount from Postgres, on my machine
    // 2.5s for 1.5m runs, will be far greater in future. So run as concurrently
    // as we can without exhausting the connection pool; half the pool size
    // should do.
    const limit = pLimit(10);
    await Promise.all(
      Enum.values(Gamemode).map((gamemode) =>
        this.initGamemodeLeaderboards(gamemode, limit)
      )
    );
    console.timeEnd('leaderboard-init');
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
            // @ts-ignore
            ...runs.map((run) => [
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
      // @ts-ignore
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
      const user = await this.db.user.findUnique({
        where: { id: Number(userID) },
        select: { alias: true }
      });
      str += `${i + 1}. ${user.alias} (${points} points)\n`;
    }

    console.log(str);
  }
}
