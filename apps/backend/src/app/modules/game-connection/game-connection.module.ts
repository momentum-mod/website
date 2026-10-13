import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { SessionModule } from '../session/session.module';
import { LobbyModule } from '../lobby/lobby.module';

@Module({
  imports: [SessionModule, LobbyModule],
  providers: [GameConnectionGateway]
})
export class GameConnectionModule {}
