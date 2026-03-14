import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';

@Module({
  imports: [DbModule, ValkeyModule],
  providers: [RankingService]
})
export class RankingModule {}
