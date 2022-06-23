import { Controller } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('api/v1/stats')
@ApiTags('Stats')
export class StatsController {
    constructor(private readonly statsService: StatsService) {}
}
