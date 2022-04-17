import { Logger, Module } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryPerformanceService } from './sentry-performance/sentry-performance.service';
import { SentryInterceptor } from './sentry.interceptor';
import { SentryExceptionService } from './sentry-exception/sentry-exception.service';

export const SENTRY_OPTIONS = 'SENTRY_OPTIONS';

@Module({
    providers: [SentryPerformanceService, SentryExceptionService]
})
export class SentryModule {
    static forRoot(options: Sentry.NodeOptions) {
        // initialization of Sentry, this is where Sentry will create a Hub
        Logger.log(`'Init sentry with these options: [${JSON.stringify(options)}]`);

        Sentry.init(options);

        return {
            module: SentryModule,
            providers: [
                {
                    provide: SENTRY_OPTIONS,
                    useValue: options
                },
                SentryPerformanceService,
                SentryExceptionService,
                {
                    provide: APP_INTERCEPTOR,
                    useClass: SentryInterceptor
                }
            ],
            exports: [SentryPerformanceService, SentryExceptionService]
        };
    }
}
