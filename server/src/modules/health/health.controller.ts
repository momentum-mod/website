
import { Controller, Get } from '@nestjs/common';
import { HealthCheckResult } from '@nestjs/terminus';
import { Public } from '../auth/public.decorator';
import { HealthService } from '../health/health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @Public()
  public async check(): Promise<HealthCheckResult> {
    return await this.healthService.check();
  }
}
