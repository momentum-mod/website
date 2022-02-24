import { HealthIndicatorResult, HttpHealthIndicator } from '@nestjs/terminus';
import { PrometheusService } from '../../../modules/prometheus/prometheus.service';
import { HealthIndicator } from '../interface/health-indicator.interface';
import { BaseHealthIndicator } from './base-health.indicator';

export class ApiHealthIndicator extends BaseHealthIndicator implements HealthIndicator {
    public readonly name;
    protected readonly help = 'Status of ' + this.name;
    protected readonly promClientService: PrometheusService | undefined;

    private readonly url: string;
    private readonly httpHealthIndicator: HttpHealthIndicator;

    /**
     * @param name Name of indicator, cannot include whitespace
     * @param httpHealthIndicator
     * @param url Url of api you're checking health of
     * @param promClientService
     */
    constructor(
        name: string,
        httpHealthIndicator: HttpHealthIndicator,
        url: string | undefined,
        promClientService?: PrometheusService
    ) {
        super();
        this.httpHealthIndicator = httpHealthIndicator;
        this.promClientService = promClientService;
        this.name = name || 'Api';
        this.url = url || '';
        this.registerMetrics();
        this.registerGauges();
    }

    public async isHealthy(): Promise<HealthIndicatorResult> {
        if (this.isDefined(this.url)) {
            const result: Promise<HealthIndicatorResult> = this.httpHealthIndicator.pingCheck(this.name, this.url);
            // if the api dependency isn't available, HealthCheckService
            // of Terminus throws an error that need to be catched in the HealthService
            this.updatePrometheusData(true);
            return result;
        } else {
            return {};
        }
    }
}
