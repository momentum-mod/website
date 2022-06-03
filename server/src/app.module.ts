import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './@common/filters/all-exceptions.filter';
import { appConfig } from '../config/config';
import { AuthModule } from './modules/auth/auth.module';
import { JsonBodyMiddleware } from './middlewares/json-body.middleware';
import { RawBodyMiddleware } from './middlewares/raw-body.middleware';
import { HTTPLoggerMiddleware } from './middlewares/http-logger.middleware';
import { MapsModule } from './modules/maps/maps.module';
import { UsersModule } from './modules/users/users.module';
import { UserModule } from './modules/user/user.module';
import { SentryModule } from './@common/sentry/sentry.module';

import * as Sentry from '@sentry/node';

@Module({
    imports: [
        UsersModule,
        MapsModule,
        UserModule,
        AuthModule,
        SentryModule.forRoot({
            dsn: appConfig.sentry.dsn,
            tracesSampleRate: 1.0,
            debug: appConfig.sentry.debug,
            environment: process.env.NODE_ENV || 'development'
        })
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter
        }
    ]
})
export class AppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer
            // Accept raw posts from these paths
            .apply(RawBodyMiddleware)
            .forRoutes({
                path: '/auth/steam/user',
                method: RequestMethod.POST
            })
            // Accept JSON from these paths
            .apply(JsonBodyMiddleware)
            .forRoutes('*')
            // Add the http logger to these paths
            .apply(HTTPLoggerMiddleware)
            .forRoutes('/api/*')
            // Add Sentry to these paths
            .apply(Sentry.Handlers.requestHandler())
            .forRoutes({
                path: '*',
                method: RequestMethod.ALL
            });
    }
}
