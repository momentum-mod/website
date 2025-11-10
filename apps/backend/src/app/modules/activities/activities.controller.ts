import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ActivitiesGetQueryDto,
  ActivityDto,
  ApiOkPagedResponse,
  PagedResponseDto
} from '../../dto';
import { ActivitiesService } from './activities.service';
import { BypassLimited } from '../../decorators';

@Controller('activities')
@ApiTags('Activities')
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @BypassLimited()
  @ApiOperation({ summary: 'Returns a list of activities' })
  @ApiOkPagedResponse(ActivityDto, {
    description: 'Paginated list of activities'
  })
  getActivities(
    @Query() query?: ActivitiesGetQueryDto
  ): Promise<PagedResponseDto<ActivityDto>> {
    return this.activitiesService.getAll(query);
  }
}
