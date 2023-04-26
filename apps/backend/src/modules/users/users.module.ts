import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RepoModule } from '../repo/repo.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [RepoModule, SteamModule, RunsModule, FileStoreModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
