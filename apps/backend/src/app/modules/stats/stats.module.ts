import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { DbModule } from '../database/db.module';

@Module({
  imports: [DbModule.forRoot()],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
