import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';

/**
 * Rank points. Depends only on the DB and Valkey so that every module that
 * mutates leaderboard runs (runs, session, admin, maps) can import it without
 * creating cycles.
 */
@Module({
  imports: [DbModule, ValkeyModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService]
})
export class RankingModule {}
