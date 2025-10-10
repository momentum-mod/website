import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { XpSystemsService } from './xp-systems.service';
import { LeaderboardType } from '@momentum/constants';

@Injectable()
export class RankingService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly xpSystems: XpSystemsService
  ) {}

  private readonly logger = new Logger('RankingService');

  async calculateAndStoreRankings(): Promise<void> {
    this.logger.log('Starting ranked XP calculation...');

    const startTime = Date.now();

    try {
      // Use the same optimized query as Rust version
      const query = `
              SELECT
                l."gamemode",
                array_agg(lr."userID" ORDER BY lr."rank") AS user_ids
              FROM "Leaderboard" l
              JOIN "LeaderboardRun" lr ON
                l."mapID" = lr."mapID"
                AND l."gamemode" = lr."gamemode"
                AND l."trackType" = lr."trackType"
                AND l."trackNum" = lr."trackNum"
                AND l."style" = lr."style"
              WHERE l.type = $1
              GROUP BY l."mapID", l."gamemode", l."trackType", l."trackNum", l."style"
              HAVING count(lr."userID") > 1
            `;

      const rows = await this.db.$queryRawUnsafe<
        {
          gamemode: number;
          user_ids: number[];
        }[]
      >(query, LeaderboardType.RANKED);

      const fetchDuration = Date.now() - startTime;
      this.logger.log(
        `Fetched ${rows.length} leaderboards from DB in ${fetchDuration}ms`
      );

      let totalRunsProcessed = 0;
      // Map of (gamemode, userID) -> total XP
      const userXpGains = new Map<string, number>();

      // Process each leaderboard in memory
      for (const row of rows) {
        const gamemode = row.gamemode;
        const userIds = row.user_ids;
        const completions = userIds.length;

        if (completions === 0) {
          continue;
        }

        // Process each run in the leaderboard
        for (let index = 0; index < userIds.length; index++) {
          const userId = userIds[index];
          const rank = index + 1;

          const rankXpGain = this.xpSystems.getRankXpForRank(rank, completions);

          // Accumulate XP for this user/gamemode combination
          const key = `${gamemode}:${userId}`;
          const currentXp = userXpGains.get(key) || 0;
          userXpGains.set(key, currentXp + rankXpGain.rankXP);

          totalRunsProcessed++;
        }
      }

      this.logger.log(
        `Processed ${totalRunsProcessed} runs across ${userXpGains.size} unique user/gamemode combinations`
      );

      // Batch store XP gains in Redis using pipeline
      const BATCH_SIZE = 5000;
      let batch: Array<[string, number]> = [];

      for (const [gamemodeUserId, totalXp] of userXpGains) {
        const [gamemode, userId] = gamemodeUserId.split(':');
        const redisKey = `rank:${gamemode}:${userId}`;

        batch.push([redisKey, totalXp]);

        // Execute batch when we hit batch size
        if (batch.length >= BATCH_SIZE) {
          await this.executeBatch(batch);
          batch = [];
        }
      }

      // Execute remaining batch
      if (batch.length > 0) {
        await this.executeBatch(batch);
      }

      const totalDuration = Date.now() - startTime;
      this.logger.log(`Ranked XP calculation completed in ${totalDuration}ms`);
      this.logger.log(`Processed ${totalRunsProcessed} total runs`);
    } catch (error) {
      this.logger.error('Error calculating ranked XP:', error);
      throw error;
    }
  }

  private async executeBatch(batch: Array<[string, number]>): Promise<void> {
    const pipeline = this.valkey.pipeline();

    for (const [key, value] of batch) {
      pipeline.set(key, value);
    }

    await pipeline.exec();
  }
}
