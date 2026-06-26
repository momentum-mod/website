import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';
import { KillswitchModule } from '../killswitch/killswitch.module';

@Module({
  imports: [DbModule, ValkeyModule, KillswitchModule],
  providers: [GameConnectionGateway],
  exports: [GameConnectionGateway]
})
export class GameConnectionModule {}
