import { DynamicModule, Logger, Module } from '@nestjs/common';
import { SentryPerformanceService } from './sentry-performance/sentry-performance.service';
import { SentryInterceptor } from './sentry-performance/sentry.interceptor';
import { SentryExceptionService } from './sentry-exception/sentry-exception.service';
import { SentryModuleOptions } from './sentry.interface';
import { Environment } from '../../../config/config.interface';
import * as Sentry from '@sentry/node';
import { ConfigModule } from '@nestjs/config';

@Module({
    providers: [SentryPerformanceService, SentryExceptionService]
})
export class SentryModule {
    static forRoot(options: SentryModuleOptions): DynamicModule {
        const logger = new Logger('Sentry');

        const enablePerfTracking = options.perfTracking;

        if (options.environment === Environment.Production) {
            if (!options.sentryOpts.dsn) {
                logger.error('Sentry DSN not set');
                return;
            } else {
                Sentry.init(options.sentryOpts);
                logger.log(`Initialised Sentry with ${JSON.stringify(options.sentryOpts)}`);
            }
        }

        return {
            module: SentryModule,
            imports: [ConfigModule],
            providers: enablePerfTracking ? [SentryPerformanceService, SentryInterceptor] : [SentryExceptionService],
            exports: enablePerfTracking ? [SentryPerformanceService, SentryExceptionService] : [SentryExceptionService]
        };
    }
}
