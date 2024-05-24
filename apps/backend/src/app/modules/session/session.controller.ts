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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { GameAuthGuard } from '../auth/jwt/game.guard';
import {
  CompletedRunDto,
  CreateRunSessionDto,
  RunSessionDto,
  UpdateRunSessionDto
} from '../../dto';
import { LoggedInUser } from '../../decorators';
import { ParseIntSafePipe } from '../../pipes';
import { RunSessionService } from './run/run-session.service';

@Controller('session')
@UseGuards(GameAuthGuard)
@ApiTags('Session')
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly runSessionService: RunSessionService) {}

  @Post('/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Starts a run' })
  @ApiBody({ type: CreateRunSessionDto })
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

  @Delete('/run/:sessionID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    type: Number,
    description: 'Target Session ID',
    name: 'sessionID',
    required: true
  })
  @ApiNoContentResponse({ description: 'Session deleted successfully' })
  @ApiBadRequestResponse({ description: 'Session does not exist' })
  @ApiBadRequestResponse({
    description: 'Session does not belong to that user'
  })
  invalidateSession(
    @LoggedInUser('id') userID: number,
    @Param('sessionID', ParseIntSafePipe) sessionID: number
  ): Promise<void> {
    return this.runSessionService.invalidateSession(userID, sessionID);
  }

  @Post('/run/:sessionID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'sessionID',
    type: Number,
    description: 'Target Session ID',
    required: true
  })
  @ApiBody({ type: UpdateRunSessionDto })
  @ApiNoContentResponse({ description: 'Timestamp submitted successfully' })
  @ApiBadRequestResponse({ description: 'Session does not exist' })
  @ApiBadRequestResponse({ description: 'Timestamps are invalid' })
  @ApiForbiddenResponse({ description: 'Session does not belong to user' })
  updateRunSession(
    @LoggedInUser('id') userID: number,
    @Param('sessionID', ParseIntSafePipe) sessionID: number,
    @Body() body: UpdateRunSessionDto
  ): Promise<void> {
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
