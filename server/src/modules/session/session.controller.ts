import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    ParseIntPipe,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors
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
import { CreateRunSessionDto, RunSessionDto, UpdateRunSessionDto } from '@common/dto/run/run-session.dto';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';
import { RunSessionTimestampDto } from '@common/dto/run/run-session-timestamp.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompletedRunDto } from '@common/dto/run/completed-run.dto';
import { RunSessionService } from './run/run-session.service';
import { GameAuthGuard } from '@modules/auth/guards/game-auth.guard';

@Controller('api/session')
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
        description: 'Run Session DTO, including the ID of the run to use on other run run endpoints'
    })
    @ApiBadRequestResponse({ description: 'Body is invalid' })
    @ApiBadRequestResponse({ description: 'Map does not exist' }) // Could 404 but we'd have to do an extra DB query
    createRunSession(@LoggedInUser('id') userID: number, @Body() body: CreateRunSessionDto): Promise<RunSessionDto> {
        return this.runSessionService.createSession(userID, body);
    }

    @Delete('/run')
    @HttpCode(HttpStatus.NO_CONTENT)
    invalidateSession(@LoggedInUser('id') userID: number): Promise<void> {
        return this.runSessionService.invalidateSession(userID);
    }

    @Post('/run/:sessionID')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'mapID', type: Number, description: 'Target Map ID', required: true })
    @ApiParam({ name: 'sessionID', type: Number, description: 'Target Session ID', required: true })
    @ApiOkResponse({ type: RunSessionTimestampDto, description: 'Timestamp of Run Session' })
    @ApiBadRequestResponse({ description: 'Session does not exist' })
    @ApiBadRequestResponse({ description: 'Timestamps are invalid' })
    @ApiForbiddenResponse({ description: 'Session does not belong to user' })
    updateRunSession(
        @LoggedInUser('id') userID: number,
        @Param('sessionID', ParseIntPipe) sessionID: number,
        @Body() body: UpdateRunSessionDto
    ): Promise<RunSessionTimestampDto> {
        return this.runSessionService.updateSession(userID, sessionID, body);
    }

    @Post('/run/:sessionID/end')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    @ApiParam({ name: 'sessionID', type: Number, description: 'Target Session ID', required: true })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    completeRunSession(
        @LoggedInUser('id') userID: number,
        @Param('sessionID', ParseIntPipe) sessionID: number,
        @UploadedFile(
            'file',
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({
                        maxSize: 80 * 1000 * 1000 // 80 MB is the upper bound limit of ~10 hours of replay file
                    })
                ]
            })
        )
        replayFile: Express.Multer.File
    ): Promise<CompletedRunDto> {
        if (!replayFile || !replayFile.buffer || !Buffer.isBuffer(replayFile.buffer))
            throw new BadRequestException('File is not a valid replay');

        return this.runSessionService.completeSession(userID, sessionID, replayFile.buffer);
    }
}
