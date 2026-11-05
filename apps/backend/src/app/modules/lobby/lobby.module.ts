import { Module } from '@nestjs/common';
import { ValkeyModule } from '../valkey/valkey.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { LobbyService } from './lobby.service';

@Module({
  imports: [ValkeyModule, WebsocketsModule],
  providers: [LobbyService],
  exports: [LobbyService]
})
export class LobbyModule {}
