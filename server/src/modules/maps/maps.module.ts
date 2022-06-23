import { Module } from '@nestjs/common';
import { MapsRepoService } from '../repo/maps-repo.service';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { RepoModule } from '../repo/repo.module';
import { AuthModule } from '../auth/auth.module';
import { FileStoreModule } from '../filestore/file-store.module';

@Module({
    imports: [RepoModule, AuthModule, FileStoreModule], // TODO: why is auth needed?
    controllers: [MapsController],
    providers: [MapsService, MapsRepoService],
    exports: [MapsService]
})
export class MapsModule {}
