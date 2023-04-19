import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { RepoModule } from '../repo/repo.module';

@Module({
  imports: [RepoModule],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
