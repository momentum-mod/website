import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { SessionModule } from '../session/session.module';
import { LobbyModule } from '../lobby/lobby.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [SessionModule, LobbyModule, ReportsModule],
  providers: [GameConnectionGateway]
})
export class GameConnectionModule {}
