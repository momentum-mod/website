import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { UserCacheModule } from '../user-cache/user-cache.module';

@Module({
  imports: [DbModule, ValkeyModule, UserCacheModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService]
})
export class RankingModule {}
