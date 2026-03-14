import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { TypedSql } from '@momentum/db';
import { Gamemode, LeaderboardID, LeaderboardType } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import pLimit, { LimitFunction } from 'p-limit';

@Injectable()
export class RankingService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService
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

    let total = 0;

    await Promise.all(
      leaderboards.map(({ mapID, gamemode, trackType, trackNum, style }) =>
        limit(async () => {
          // Experimented with using a stored procedure here, but no noticeable
          // difference.
          const runs = await this.db.$queryRawTyped(
            TypedSql.getRankedRuns(mapID, gamemode, trackType, trackNum, style)
          );
          total += runs.length;
        })
      )
    );

    console.log(
      `Gamemode ${gamemode}: ${total} ranked runs across ${leaderboards.length} leaderboards`
    );
  }
}
