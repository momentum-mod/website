import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { SessionModule } from '../session/session.module';
import { LobbyModule } from '../lobby/lobby.module';
import { ChatBansModule } from '../chat-bans/chat-bans.module';

@Module({
  imports: [SessionModule, LobbyModule, ChatBansModule],
  providers: [GameConnectionGateway]
})
export class GameConnectionModule {}
