import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { AdminModule } from '../admin/admin.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserCacheService } from './user-cache.service';
import { KillswitchModule } from '../killswitch/killswitch.module';

@Module({
  imports: [
    DbModule,
    SteamModule,
    RunsModule,
    FileStoreModule,
    KillswitchModule,
    ValkeyModule,
    forwardRef(() => AdminModule)
  ],
  controllers: [UsersController],
  providers: [UsersService, UserCacheService],
  exports: [UsersService, UserCacheService]
})
export class UsersModule {}
