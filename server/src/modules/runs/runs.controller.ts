import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { RunsService } from './runs.service';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { RunDto } from '../../@common/dto/run/runs.dto';
import { RunsGetAllQuery } from '../../@common/dto/query/run-queries.dto';

@ApiBearerAuth()
@Controller('api/v1/runs')
@ApiTags('Runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
    constructor(private readonly runsService: RunsService) {}

    @Get()
    @ApiOperation({ summary: 'Returns a list of runs' })
    @ApiOkPaginatedResponse(RunDto, { description: 'Paginated list of runs' })
    public async GetRuns(@Query() query?: RunsGetAllQuery): Promise<PaginatedResponseDto<RunDto>> {
        return void 0;
    }

    @Get('/:runID')
    @ApiOperation({ summary: 'Returns a single run' })
    @ApiParam({
        name: 'runID',
        type: Number,
        description: 'Target Run ID',
        required: true
    })
    @ApiOkResponse({ type: RunDto, description: 'The found run' })
    @ApiNotFoundResponse({ description: 'Run was not found' })
    public async GetRun(@Param('runID', ParseIntPipe) runID: number): Promise<RunDto> {
        return void 0;
    }

    @Get('/:runID/download')
    @ApiOperation({ summary: 'Downloads the replay file for a run' })
    @ApiParam({
        name: 'runID',
        type: Number,
        description: 'Target Run ID',
        required: true
    })
    @ApiOkResponse({ description: 'A run replay file in binary format' })
    @ApiNotFoundResponse({ description: 'Run replay was not found' })
    public async DownloadRun(@Param('runID', ParseIntPipe) runID: number): Promise<any> {
        return void 0;
    }
}
