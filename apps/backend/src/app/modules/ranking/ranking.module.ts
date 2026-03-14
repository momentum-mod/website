import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';

@Module({
  imports: [DbModule, ValkeyModule, XpSystemsModule],
  providers: [RankingService]
})
export class RankingModule {}
