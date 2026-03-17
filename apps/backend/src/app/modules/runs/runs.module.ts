import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '../steam/steam.module';
import { MapsModule } from '../maps/maps.module';
import { LeaderboardRunsService } from './leaderboard-runs.service';
import { PastRunsService } from './past-runs.service';
import { LeaderboardService } from './leaderboard.service';
import { RunsController } from './runs.controller';
import { LeaderboardRunsDbService } from './leaderboard-runs-db.service';
import { RankingModule } from '../ranking/ranking.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';

@Module({
  imports: [
    DbModule,
    forwardRef(() => MapsModule),
    FileStoreModule,
    SteamModule,
    RankingModule,
    XpSystemsModule
  ],
  providers: [
    LeaderboardRunsService,
    PastRunsService,
    LeaderboardService,
    LeaderboardRunsDbService
  ],
  exports: [
    LeaderboardRunsService,
    PastRunsService,
    LeaderboardService,
    LeaderboardRunsDbService
  ],
  controllers: [RunsController]
})
export class RunsModule {}
