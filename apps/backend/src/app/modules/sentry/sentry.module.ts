import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Environment } from '../../config';
import {
  SentryInitState,
  SentryModuleAsyncOptions,
  SentryModuleOptions
} from './sentry.interface';
import { SENTRY_INIT_STATE, SENTRY_MODULE_OPTIONS } from './sentry.const';
import { SentryInterceptor } from '../../interceptors/sentry.interceptor';

@Module({})
export class SentryModule {
  static forRootAsync(options: SentryModuleAsyncOptions): DynamicModule {
    // Provides the options passed in from app.module to other providers
    const optionsProvider: Provider = {
      provide: SENTRY_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? []
    };

    return {
      module: SentryModule,
      imports: options.imports,
      providers: [
        optionsProvider,
        {
          inject: [SENTRY_MODULE_OPTIONS],
          // Tracks whether we initialised Sentry and provides it to the
          // below provider and other modules
          provide: SENTRY_INIT_STATE,
          // Instantiates Sentry, if in production and DSN is set
          useFactory: ({
            environment,
            sentryOpts
          }: SentryModuleOptions): SentryInitState => {
            const logger = new Logger('Sentry Module Setup');

            if (environment !== Environment.PRODUCTION) {
              return false;
            }

            if (!sentryOpts?.dsn) {
              logger.warn('Sentry DSN not set, not initializing!');
              return false;
            }

            Sentry.init(sentryOpts);
            logger.log(`Initialised Sentry with ${JSON.stringify(sentryOpts)}`);
            return true;
          }
        },
        {
          inject: [SENTRY_MODULE_OPTIONS, SENTRY_INIT_STATE],
          provide: SentryInterceptor,
          // Only actually instantiate the service if we initialised Sentry and
          // have tracing enabled
          useFactory: (
            { enableTracing }: SentryModuleOptions,
            initState: SentryInitState
          ) =>
            enableTracing && initState ? new SentryInterceptor() : undefined
        }
      ],
      exports: [SentryInterceptor, SENTRY_INIT_STATE]
    };
  }
}
