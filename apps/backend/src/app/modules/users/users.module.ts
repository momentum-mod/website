import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';

@Module({
  imports: [DbModule.forRoot(), SteamModule, RunsModule, FileStoreModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
