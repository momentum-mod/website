import { Controller, Get, Param, Query } from '@nestjs/common';
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
  PastRunDto,
  PastRunsGetAllQueryDto,
  PastRunsGetQueryDto
} from '../../dto';
import { LoggedInUser, BypassJwtAuth, BypassLimited } from '../../decorators';
import { ParseIntSafePipe } from '../../pipes';
import { PastRunsService } from './past-runs.service';

@Controller('runs')
@BypassJwtAuth()
@ApiTags('Runs')
@ApiBearerAuth()
export class RunsController {
  constructor(private readonly pastRunsService: PastRunsService) {}

  @Get()
  @BypassLimited()
  @ApiOperation({
    summary:
      'Returns a paginated list of all submitted runs, include non-PBs.' +
      'By default only returns APPROVED maps, unless mapID is specified.'
  })
  @ApiOkPagedResponse(PastRunDto, {
    description: 'Paginated list of runs'
  })
  getRuns(
    @LoggedInUser('id') userID?: number,
    @Query() query?: PastRunsGetAllQueryDto
  ): Promise<PagedResponseDto<PastRunDto>> {
    return this.pastRunsService.getAll(query, userID);
  }

  @Get('/:runID')
  @BypassLimited()
  @ApiOperation({ summary: 'Returns a single run' })
  @ApiParam({
    name: 'runID',
    type: Number,
    description: 'Target Run ID',
    required: true
  })
  @ApiOkResponse({ type: PastRunDto, description: 'The found run' })
  @ApiNotFoundResponse({ description: 'Run was not found' })
  getRun(
    @Param('runID', ParseIntSafePipe) pastRunID: number,
    @Query() query: PastRunsGetQueryDto,
    @LoggedInUser('id') userID?: number
  ): Promise<PastRunDto> {
    return this.pastRunsService.get(pastRunID, query, userID);
  }
}
