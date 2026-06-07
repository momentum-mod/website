import { UseGuards } from '@nestjs/common';
import { KillswitchType } from '@momentum/constants';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets';
import { CreateRunSessionDto, RunSessionDto } from '../../dto';
import { LoggedInUser } from '../../decorators';
import { Killswitch } from '../killswitch/killswitch.decorator';
import { KillswitchGuard } from '../killswitch/killswitch.guard';
import { RunSessionService } from '../session/run/run-session.service';

@WebSocketGateway({ path: '/jame' })
export class GameConnectionGateway {
  constructor(private readonly runSessionService: RunSessionService) {}

  @SubscribeMessage('create-bun')
  @UseGuards(KillswitchGuard)
  @Killswitch(KillswitchType.RUN_SUBMISSION)
  createRunSession(
    @LoggedInUser('id') userID: number,
    @MessageBody() body: CreateRunSessionDto
  ): Promise<RunSessionDto> {
    return this.runSessionService.createSession(userID, body);
  }
}

/**
 * { event: 'game/create-run', data: CreateRunSessionDto }
 */
