import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [DbModule],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
