
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Public()
  public metrics(): Promise<string> {
    return this.metricsService.metrics;
  }
}
