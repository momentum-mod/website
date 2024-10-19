import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { AdminModule } from '../admin/admin.module';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { MapCreditsService } from './map-credits.service';
import { MapImageService } from './map-image.service';
import { MapTestInviteService } from './map-test-invite.service';
import { MapListService } from './map-list.service';
import { MapReviewModule } from '../map-review/map-review.module';
import { KillswitchModule } from '../killswitch/killswitch.module';
import { MapWebhooksService } from './map-webhooks.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    DbModule.forRoot(),
    FileStoreModule,
    SteamModule,
    SessionModule,
    forwardRef(() => RunsModule),
    forwardRef(() => AdminModule),
    forwardRef(() => MapReviewModule),
    KillswitchModule,
    HttpModule
  ],
  controllers: [MapsController],
  providers: [
    MapsService,
    MapCreditsService,
    MapImageService,
    MapTestInviteService,
    MapListService,
    MapWebhooksService
  ],
  exports: [MapsService]
})
export class MapsModule {}
