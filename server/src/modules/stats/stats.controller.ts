import { Controller } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('api/stats')
@ApiTags('Stats')
@ApiBearerAuth()
export class StatsController {
    constructor(private readonly _statsService: StatsService) {}
}
