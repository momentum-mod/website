import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { ActivitiesGetQuery } from '../../@common/dto/query/activity-queries.dto';

@ApiBearerAuth()
@Controller('api/v1/activities')
@ApiTags('Activities')
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) {}

    @Get()
    @ApiOperation({ summary: 'Returns a list of activities' })
    @ApiOkPaginatedResponse(ActivityDto, { description: 'Paginated list of activities' })
    async getActivities(@Query() query?: ActivitiesGetQuery): Promise<PaginatedResponseDto<ActivityDto>> {
        return void 0;
    }
}
