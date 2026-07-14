import { Module } from '@nestjs/common';
import { GameConnectionGateway } from './game-connection.gateway';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [SessionModule],
  providers: [GameConnectionGateway]
})
export class GameConnectionModule {}
