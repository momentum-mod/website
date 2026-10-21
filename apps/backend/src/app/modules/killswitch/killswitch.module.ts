import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { KillswitchService } from './killswitch.service';

@Module({
  imports: [DbModule, ValkeyModule],
  providers: [KillswitchService],
  exports: [KillswitchService]
})
export class KillswitchModule {}
