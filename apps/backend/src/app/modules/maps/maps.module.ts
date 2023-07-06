import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { MapLibraryService } from './map-library.service';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { RanksModule } from '../ranks/ranks.module';

@Module({
  imports: [
    DbModule,
    FileStoreModule,
    SteamModule,
    SessionModule,
    RunsModule,
    RanksModule
  ],
  controllers: [MapsController],
  providers: [MapsService, MapLibraryService],
  exports: [MapsService, MapLibraryService]
})
export class MapsModule {}
