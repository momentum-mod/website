import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { UserCacheModule } from '../user-cache/user-cache.module';

/**
 * Rank points. Depends only on the DB, Valkey and the user cache so that
 * every module that mutates leaderboard runs (runs, session, admin, maps) can
 * import it without creating cycles.
 */
@Module({
  imports: [DbModule, ValkeyModule, UserCacheModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService]
})
export class RankingModule {}
