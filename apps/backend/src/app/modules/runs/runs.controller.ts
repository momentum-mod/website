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
  ApiOkPagedResponse,
  PagedResponseDto,
  RunDto,
  RunsGetAllQueryDto,
  RunsGetQueryDto
} from '@momentum/backend/dto';
import { ParseIntSafePipe } from '@momentum/backend/pipes';

@Controller('runs')
@ApiTags('Runs')
@ApiBearerAuth()
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Get()
  @ApiOperation({ summary: 'Returns a paginated list of runs' })
  @ApiOkPagedResponse(RunDto, { description: 'Paginated list of runs' })
  getRuns(
    @Query() query?: RunsGetAllQueryDto
  ): Promise<PagedResponseDto<RunDto>> {
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
    @Query() query?: RunsGetQueryDto
  ): Promise<RunDto> {
    return this.runsService.get(runID, query.expand);
  }
}
