import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { PrometheusService } from '../prometheus/prometheus.service';
import { HealthIndicator } from '../../@common/health/interface/health-indicator.interface';
import { ApiHealthIndicator } from '../../@common/health/indicators/api-health.indicator';
import { appConfig } from 'config/config';

@Injectable()
export class HealthService {
    private readonly listOfThingsToMonitor: HealthIndicator[];

    constructor(
        private health: HealthCheckService,
        private httpIndicator: HttpHealthIndicator,
        private promClientService: PrometheusService
    ) {
        this.listOfThingsToMonitor = [
            new ApiHealthIndicator(
                'Api',
                this.httpIndicator,
                appConfig.baseURL_API + '/api/v1/users', // needs to be a endpoint that is always avaliable and public
                this.promClientService
            ),
            new ApiHealthIndicator(
                'Auth',
                this.httpIndicator,
                appConfig.baseURL_API + '/auth', // needs to be a endpoint that is always avaliable and public
                this.promClientService
            )
        ];
    }

    @HealthCheck()
    public async check(): Promise<HealthCheckResult | undefined> {
        return await this.health.check(
            this.listOfThingsToMonitor.map((apiIndicator: HealthIndicator) => async () => {
                try {
                    return await apiIndicator.isHealthy();
                } catch (e) {
                    Logger.warn(JSON.stringify(e));
                    return apiIndicator.reportUnhealthy();
                }
            })
        );
    }
}
