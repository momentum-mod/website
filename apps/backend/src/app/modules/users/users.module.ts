import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { SteamModule } from '../steam/steam.module';
import { RunsModule } from '../runs/runs.module';
import { AdminModule } from '../admin/admin.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KillswitchModule } from '../killswitch/killswitch.module';
import { RankingModule } from '../ranking/ranking.module';
import { UserCacheModule } from '../user-cache/user-cache.module';

@Module({
  imports: [
    DbModule,
    SteamModule,
    RunsModule,
    FileStoreModule,
    KillswitchModule,
    RankingModule,
    UserCacheModule,
    forwardRef(() => AdminModule)
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
