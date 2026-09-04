import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { GameAuthGuard } from '../auth/jwt/game.guard';
import { CompletedRunDto } from '../../dto';
import { LoggedInUser } from '../../decorators';
import { ParseIntSafePipe } from '../../pipes';
import { RunSessionService } from './run/run-session.service';
import { KillswitchGuard } from '../killswitch/killswitch.guard';
import { Killswitch } from '../killswitch/killswitch.decorator';
import { KillswitchType } from '@momentum/constants';

// Run sessions are created, updated and invalidated over the WebSocket game
// connection (see GameConnectionGateway). Only the run submission / replay
// upload remains here, since WebSockets aren't well suited to large binary
// uploads.
@Controller('session')
@UseGuards(GameAuthGuard)
@ApiTags('Session')
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly runSessionService: RunSessionService) {}

  @Post('/run/:sessionID/end')
  @UseGuards(KillswitchGuard)
  @Killswitch(KillswitchType.RUN_SUBMISSION)
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'sessionID',
    type: Number,
    description: 'Target Session ID',
    required: true
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: 'application/octet-stream',
    description: 'Octet-stream of a replay data',
    required: true
  })
  completeRunSession(
    @LoggedInUser('id') userID: number,
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Param('sessionID', ParseIntSafePipe) sessionID: number
  ): Promise<CompletedRunDto[]> {
    const replayBuffer = req.rawBody;
    if (!replayBuffer || !Buffer.isBuffer(replayBuffer))
      throw new BadRequestException('File is not a valid replay');

    return this.runSessionService.completeSession(
      userID,
      sessionID,
      replayBuffer
    );
  }
}
