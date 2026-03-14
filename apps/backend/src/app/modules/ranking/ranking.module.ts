import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DbModule, ValkeyModule, XpSystemsModule, UsersModule],
  controllers: [RankingController],
  providers: [RankingService]
})
export class RankingModule {}
