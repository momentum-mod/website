import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';

@Module({
  providers: [PrometheusService],
  exports: [PrometheusService]
})
export class PrometheusModule {}
