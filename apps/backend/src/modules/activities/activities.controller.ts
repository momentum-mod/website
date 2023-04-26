import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ActivitiesGetQuery,
  ActivityDto,
  ApiOkPaginatedResponse,
  PaginatedResponseDto
} from '@momentum/backend/dto';

@Controller('activities')
@ApiTags('Activities')
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Returns a list of activities' })
  @ApiOkPaginatedResponse(ActivityDto, {
    description: 'Paginated list of activities'
  })
  getActivities(
    @Query() query?: ActivitiesGetQuery
  ): Promise<PaginatedResponseDto<ActivityDto>> {
    return this.activitiesService.getAll(query);
  }
}
