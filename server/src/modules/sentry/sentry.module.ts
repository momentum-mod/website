import { DynamicModule, Logger, Module, Provider, Scope } from '@nestjs/common';
import { SentryService } from './sentry.service';
import { SentryInitState, SentryModuleAsyncOptions, SentryModuleOptions } from './sentry.interface';
import { Environment } from '../../../config/config.interface';
import * as Sentry from '@sentry/node';
import { SENTRY_INIT_STATE, SENTRY_MODULE_OPTIONS } from './sentry.constants';

@Module({})
export class SentryModule {
    static forRootAsync(options: SentryModuleAsyncOptions): DynamicModule {
        // Provides the options passed in from app.module to other providers
        const optionsProvider: Provider = {
            provide: SENTRY_MODULE_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject || []
        };

        return {
            module: SentryModule,
            imports: options.imports,
            providers: [
                optionsProvider,
                {
                    inject: [SENTRY_MODULE_OPTIONS],
                    provide: SENTRY_INIT_STATE,

                    // Instantiates Sentry, if in production and DSN is set
                    useFactory: (opts: SentryModuleOptions): SentryInitState => {
                        const logger = new Logger('Sentry');
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

                        // Tracks whether we initialised Sentry and provides it to the below provider and other modules
                        return enabled;
                    }
                },
                {
                    inject: [SENTRY_INIT_STATE],
                    provide: SentryService,
                    // Only actually instantiate the service if we initialised Sentry
                    useFactory: (initState: SentryInitState) => (initState ? new SentryService() : undefined)
                }
            ],
            exports: [SentryService, SENTRY_INIT_STATE]
        };
    }
}
