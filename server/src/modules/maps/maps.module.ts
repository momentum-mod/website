import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SessionModule } from '../session/session.module';
import { RunsService } from '../runs/runs.service';
import { MapLibraryService } from './map-library.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [RepoModule, AuthModule, FileStoreModule, SessionModule, UsersModule, ConfigModule], // TODO: why is auth needed?
    controllers: [MapsController],
    providers: [MapsService, RunsService /* TODO: Huh? */, MapLibraryService],
    exports: [MapsService, MapLibraryService]
})
export class MapsModule {}
