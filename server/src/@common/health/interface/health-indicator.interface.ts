import { HealthIndicatorResult } from "@nestjs/terminus";

export interface HealthIndicator {
    name: string;
    callMetrics: any;
    customMetricsRegistered: boolean;
    customGaugesRegistered: boolean;
    updatePrometheusData(isConnected: boolean): void;
    isHealthy(): Promise<HealthIndicatorResult>;
    reportUnhealthy(): HealthIndicatorResult;
  }
