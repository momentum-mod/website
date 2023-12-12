import { forwardRef, Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { MapLibraryService } from './map-library.service';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { MapReviewService } from './map-review.service';
import { MapCreditsService } from './map-credits.service';
import { MapImageService } from './map-image.service';
import { MapTestingRequestService } from './map-testing-request.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    DbModule.forRoot(),
    FileStoreModule,
    SteamModule,
    SessionModule,
    forwardRef(() => RunsModule),
    forwardRef(() => AdminModule)
  ],
  controllers: [MapsController],
  providers: [
    MapsService,
    MapLibraryService,
    MapReviewService,
    MapCreditsService,
    MapImageService,
    MapTestingRequestService
  ],
  exports: [MapsService, MapLibraryService]
})
export class MapsModule {}
