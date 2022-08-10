import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ExceptionHandlerFilter } from './filters/exception-handler.filter';
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
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { SessionModule } from './modules/session/session.module';
import { XpSystemsModule } from './modules/xp-systems/xp-systems.module';
import { SessionController } from './modules/session/session.controller';
import { ConfigModule } from '@nestjs/config';
import { validate } from '../config/config.validation';
import { Config, ConfigFactory } from '../config/config';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '../.env',
            load: [ConfigFactory],
            cache: true,
            validate
        }),
        // Using Config directly here rather than from the ConfigService is messy but I don't want to upgrade this module to use
        // useFactory yet, mainly because I don't know if we're going with the performance service yet, and dynamically
        // loading the performance service and interceptor based on config vars is a nightmare. I have two stashes
        // attempting it in different ways I may come back to in the future - Tom
        SentryModule.forRoot({
            dsn: Config.sentry.dsn,
            tracesSampleRate: 1.0,
            debug: false,
            environment: Config.env
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
        XpSystemsModule
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
    ],
    controllers: [SessionController]
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
