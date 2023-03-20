import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { RepoModule } from '../repo/repo.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { RunsService } from '../runs/runs.service';
import { MapLibraryService } from './map-library.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [RepoModule, FileStoreModule, SessionModule, UsersModule, ConfigModule],
    controllers: [MapsController],
    providers: [MapsService, RunsService, MapLibraryService],
    exports: [MapsService, MapLibraryService]
})
export class MapsModule {}
