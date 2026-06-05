import { Module } from '@nestjs/common';
import { KillswitchModule } from '../killswitch/killswitch.module';
import { SessionModule } from '../session/session.module';
import { GameConnectionGateway } from './game-connection.gateway';

@Module({
  imports: [SessionModule, KillswitchModule],
  providers: [GameConnectionGateway]
})
export class GameConnectionModule {}
