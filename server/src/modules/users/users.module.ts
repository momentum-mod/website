import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RepoModule } from '../repo/repo.module';
import { RunsModule } from '@modules/runs/runs.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '@modules/steam/steam.module';

@Module({
  imports: [RepoModule, SteamModule, RunsModule, FileStoreModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
