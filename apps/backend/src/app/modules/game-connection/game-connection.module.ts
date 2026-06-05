import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { DbModule } from '../database/db.module';
import { ValkeyModule } from '../valkey/valkey.module';

@Module({
  imports: [DbModule, ValkeyModule],
  providers: [GameConnectionGateway],
  exports: [GameConnectionGateway]
})
export class GameConnectionModule {}
