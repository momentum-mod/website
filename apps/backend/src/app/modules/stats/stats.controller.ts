import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@Controller('stats')
@ApiTags('Stats')
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly _statsService: StatsService) {}
}
