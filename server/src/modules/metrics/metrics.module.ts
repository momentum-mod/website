import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { PrometheusModule } from '../prometheus/prometheus.module';
import { HealthModule } from '../health/health.module';

@Module({
    imports: [PrometheusModule, HealthModule],
    providers: [MetricsService],
    controllers: [MetricsController],
})
export class MetricsModule {}
