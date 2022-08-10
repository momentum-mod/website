import { DynamicModule, Logger, Module, Provider, Scope } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryPerformanceService } from './sentry-performance/sentry-performance.service';
import { SentryInterceptor } from './sentry-performance/sentry.interceptor';
import { SentryExceptionService } from './sentry-exception/sentry-exception.service';
import { SentryInitState, SentryModuleAsyncOptions, SentryModuleOptions } from './sentry.interface';
import { Environment } from '../../../config/config.interface';
import * as Sentry from '@sentry/node';
import { SENTRY_INIT_STATE, SENTRY_MODULE_OPTIONS, SENTRY_TOKEN } from './sentry.constants';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Module({})
export class SentryModule {
    static forRootAsync(options: SentryModuleAsyncOptions): DynamicModule {
        return {
            module: SentryModule,
            imports: options.imports,
            providers: [
                {
                    provide: SENTRY_MODULE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                },
                {
                    inject: [SENTRY_MODULE_OPTIONS],
                    provide: SENTRY_INIT_STATE,

                    // Instantiates Sentry, if in production and options are okay.
                    useFactory: (opts: SentryModuleOptions): SentryInitState => {
                        const logger = new Logger('Sentry');
                        const enablePerfTracking = opts.perfTracking;
                        let enabled = false;

                        if (opts.environment === Environment.Production) {
                            if (!opts.sentryOpts.dsn) {
                                logger.error('Sentry DSN not set');
                            } else {
                                Sentry.init(opts);
                                enabled = true;
                                logger.log(`Initialised Sentry with ${JSON.stringify(opts.sentryOpts)}`);
                            }
                        }

                        return {
                            enabled: enabled,
                            perfTracking: enablePerfTracking
                        };
                    }
                },
                // There might be a simpler way of doing this but this isn't too bad.
                // Pass our load state from the above provider to the rest to determine if we actually want to load them
                {
                    inject: [SENTRY_INIT_STATE, ConfigService],
                    provide: SentryExceptionService,
                    useFactory: (opts: SentryInitState, config: ConfigService) =>
                        opts.enabled && !opts.perfTracking ? new SentryExceptionService(config) : undefined
                },
                // If perf tracking isn't enabled don't load the interceptor and service.
                {
                    inject: [SENTRY_INIT_STATE],
                    provide: SentryPerformanceService,
                    scope: Scope.REQUEST,
                    useFactory: (opts: SentryInitState, req: Request) =>
                        opts.enabled && opts.perfTracking ? new SentryPerformanceService(req) : undefined
                },
                {
                    inject: [SENTRY_INIT_STATE, SentryPerformanceService],
                    provide: APP_INTERCEPTOR,
                    useFactory: (opts: SentryInitState, perfService: SentryPerformanceService) =>
                        opts.enabled && opts.perfTracking ? new SentryInterceptor(perfService) : undefined
                }
            ],
            exports: [SentryPerformanceService, SentryExceptionService]
        };
    }
}
