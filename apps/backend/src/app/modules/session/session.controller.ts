import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { RunSessionService } from './run/run-session.service';
import { GameAuthGuard } from '../auth/jwt/game.guard';
import {
  CompletedRunDto,
  CreateRunSessionDto,
  RunSessionDto,
  RunSessionTimestampDto,
  UpdateRunSessionDto
} from '@momentum/backend/dto';
import { LoggedInUser } from '@momentum/backend/decorators';
import { ParseIntSafePipe } from '@momentum/backend/pipes';
import { FastifyRequest } from 'fastify';

@Controller('session')
@UseGuards(GameAuthGuard)
@ApiTags('Session')
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly runSessionService: RunSessionService) {}

  @Post('/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Starts a run' })
  @ApiOkResponse({
    type: RunSessionDto,
    description:
      'Run Session DTO, including the ID of the run to use on other run run endpoints'
  })
  @ApiBadRequestResponse({ description: 'Body is invalid' })
  @ApiBadRequestResponse({ description: 'Map does not exist' }) // Could 404 but we'd have to do an extra DB query
  createRunSession(
    @LoggedInUser('id') userID: number,
    @Body() body: CreateRunSessionDto
  ): Promise<RunSessionDto> {
    return this.runSessionService.createSession(userID, body);
  }

  @Delete('/run')
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateSession(@LoggedInUser('id') userID: number): Promise<void> {
    return this.runSessionService.invalidateSession(userID);
  }

  @Post('/run/:sessionID')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'sessionID',
    type: Number,
    description: 'Target Session ID',
    required: true
  })
  @ApiOkResponse({
    type: RunSessionTimestampDto,
    description: 'Timestamp of Run Session'
  })
  @ApiBadRequestResponse({ description: 'Session does not exist' })
  @ApiBadRequestResponse({ description: 'Timestamps are invalid' })
  @ApiForbiddenResponse({ description: 'Session does not belong to user' })
  updateRunSession(
    @LoggedInUser('id') userID: number,
    @Param('sessionID', ParseIntSafePipe) sessionID: number,
    @Body() body: UpdateRunSessionDto
  ): Promise<RunSessionTimestampDto> {
    return this.runSessionService.updateSession(userID, sessionID, body);
  }

  @Post('/run/:sessionID/end')
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
  ): Promise<CompletedRunDto> {
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
