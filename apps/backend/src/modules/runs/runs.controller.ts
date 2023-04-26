import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { RunsService } from './runs.service';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import {
  ApiOkPaginatedResponse,
  PaginatedResponseDto,
  RunDto,
  RunsGetAllQuery,
  RunsGetQuery
} from '@momentum/backend/dto';
import { ParseIntSafePipe } from '@momentum/backend/pipes';

@Controller('runs')
@ApiTags('Runs')
@ApiBearerAuth()
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Get()
  @ApiOperation({ summary: 'Returns a paginated list of runs' })
  @ApiOkPaginatedResponse(RunDto, { description: 'Paginated list of runs' })
  getRuns(
    @Query() query?: RunsGetAllQuery
  ): Promise<PaginatedResponseDto<RunDto>> {
    return this.runsService.getAll(query);
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
  getRun(
    @Param('runID', ParseIntSafePipe) runID: number,
    @Query() query?: RunsGetQuery
  ): Promise<RunDto> {
    return this.runsService.get(runID, query.expand);
  }

  @Get('/:runID/download')
  @Redirect()
  @ApiOperation({ summary: 'Downloads the replay file for a run' })
  @ApiParam({
    name: 'runID',
    type: Number,
    description: 'Target Run ID',
    required: true
  })
  @ApiOkResponse({ description: 'A run replay file in binary format' })
  @ApiNotFoundResponse({ description: 'Run replay was not found' })
  async downloadRun(@Param('runID', ParseIntSafePipe) runID: number) {
    const runURL = await this.runsService.getURL(runID);
    return { url: runURL };
  }
}
