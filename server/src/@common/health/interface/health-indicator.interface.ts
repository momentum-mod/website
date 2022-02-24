import { HealthIndicatorResult } from '@nestjs/terminus';

export interface HealthIndicator {
    /**
     * @description Cannot include whitespace
     */
    name: string;
    callMetrics: any;
    customMetricsRegistered: boolean;
    customGaugesRegistered: boolean;
    updatePrometheusData(isConnected: boolean): void;
    isHealthy(): Promise<HealthIndicatorResult>;
    reportUnhealthy(): HealthIndicatorResult;
}
