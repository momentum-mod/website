import { forwardRef, Module } from '@nestjs/common';
import { PastRunsService } from './past-runs.service';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { LeaderboardRunsService } from './leaderboard-runs.service';
import { SteamModule } from '../steam/steam.module';
import { MapsModule } from '../maps/maps.module';
import { RunsController } from './runs.controller';

@Module({
  imports: [
    DbModule.forRoot(),
    forwardRef(() => MapsModule),
    FileStoreModule,
    SteamModule
  ],
  providers: [LeaderboardRunsService, PastRunsService],
  exports: [LeaderboardRunsService, PastRunsService],
  controllers: [RunsController]
})
export class RunsModule {}
