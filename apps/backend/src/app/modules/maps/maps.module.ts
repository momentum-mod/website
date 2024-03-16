import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { AdminModule } from '../admin/admin.module';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { MapLibraryService } from './map-library.service';
import { MapCreditsService } from './map-credits.service';
import { MapImageService } from './map-image.service';
import { MapTestInviteService } from './map-test-invite.service';
import { MapReviewModule } from '../map-review/map-review.module';

@Module({
  imports: [
    DbModule.forRoot(),
    FileStoreModule,
    SteamModule,
    SessionModule,
    forwardRef(() => RunsModule),
    forwardRef(() => AdminModule),
    forwardRef(() => MapReviewModule)
  ],
  controllers: [MapsController],
  providers: [
    MapsService,
    MapLibraryService,
    MapCreditsService,
    MapImageService,
    MapTestInviteService
  ],
  exports: [MapsService, MapLibraryService]
})
export class MapsModule {}
