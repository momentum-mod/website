import { Module } from '@nestjs/common';
import { XpSystemsService } from './xp-systems.service';
import { RankingService } from './ranking.service';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';

@Module({
  imports: [DbModule, ValkeyModule],
  providers: [XpSystemsService, RankingService],
  exports: [XpSystemsService, RankingService]
})
export class XpSystemsModule {}
