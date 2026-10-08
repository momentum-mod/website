import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { UserCacheService } from './user-cache.service';

/**
 * Standalone so any module (users, admin, maps, ranking...) can import it
 * without creating module cycles.
 */
@Module({
  imports: [DbModule, ValkeyModule],
  providers: [UserCacheService],
  exports: [UserCacheService]
})
export class UserCacheModule {}
