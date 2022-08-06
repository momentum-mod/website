import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ExceptionHandlerFilter } from './@common/filters/exception-handler.filter';
import { appConfig } from '../config/config';
import { AuthModule } from './modules/auth/auth.module';
import { HTTPLoggerMiddleware } from './middlewares/http-logger.middleware';
import { MapsModule } from './modules/maps/maps.module';
import { UsersModule } from './modules/users/users.module';
import { UserModule } from './modules/user/user.module';
import { SentryModule } from './modules/sentry/sentry.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RunsModule } from './modules/runs/runs.module';
import { StatsModule } from './modules/stats/stats.module';
import { JwtAuthGuard } from './modules/auth/guard/jwt-auth.guard';
import { SessionModule } from './modules/session/session.module';

@Module({
    imports: [
        SentryModule.forRoot({
            dsn: appConfig.sentry.dsn,
            tracesSampleRate: 1.0,
            debug: appConfig.sentry.debug,
            environment: process.env.NODE_ENV || 'development'
        }),
        AuthModule,
        ActivitiesModule,
        AdminModule,
        MapsModule,
        ReportsModule,
        RunsModule,
        StatsModule,
        UserModule,
        UsersModule,
        SessionModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ExceptionHandlerFilter
        },
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard
        }
    ]
})
export class AppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer
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
