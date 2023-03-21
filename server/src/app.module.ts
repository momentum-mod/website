import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ExceptionHandlerFilter } from './filters/exception-handler.filter';
import { AuthModule } from '@modules/auth/auth.module';
import { HTTPLoggerMiddleware } from './middlewares/http-logger.middleware';
import { MapsModule } from '@modules/maps/maps.module';
import { UsersModule } from '@modules/users/users.module';
import { UserModule } from '@modules/user/user.module';
import { SentryModule } from '@modules/sentry/sentry.module';
import { ActivitiesModule } from '@modules/activities/activities.module';
import { AdminModule } from '@modules/admin/admin.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { RunsModule } from '@modules/runs/runs.module';
import { StatsModule } from '@modules/stats/stats.module';
import { SessionModule } from '@modules/session/session.module';
import { XpSystemsModule } from '@modules/xp-systems/xp-systems.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from '@config/config.validation';
import { ConfigFactory } from '@config/config';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '../.env',
            load: [ConfigFactory],
            cache: true,
            validate
        }),
        SentryModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                environment: config.get('env'),
                sentryOpts: {
                    dsn: config.get('sentry.dsn'),
                    debug: false,
                    tracesSampleRate: 1
                }
            }),
            inject: [ConfigService]
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
    ]
})
export class AppModule implements NestModule {
    public configure(consumer: MiddlewareConsumer): void {
        consumer
            // Add the http logger to these paths
            .apply(HTTPLoggerMiddleware)
            .forRoutes('*');
        // // Add Sentry to these paths
        // .apply(Sentry.Handlers.requestHandler())
        // .forRoutes({
        //     path: '*',
        //     method: RequestMethod.ALL
        // });
    }
}
