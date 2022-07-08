import { Module } from '@nestjs/common';
import { MapsRepoService } from '../repo/maps-repo.service';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UsersRepoService } from '../repo/users-repo.service';

@Module({
    imports: [RepoModule, AuthModule, FileStoreModule], // TODO: why is auth needed?
    controllers: [MapsController],
    providers: [{ provide: APP_GUARD, useClass: RolesGuard }, MapsService, MapsRepoService, UsersRepoService],
    exports: [MapsService]
})
export class MapsModule {}
