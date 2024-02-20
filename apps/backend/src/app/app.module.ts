import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FastifyMulterModule } from '@nest-lab/fastify-multer';
import { ExceptionHandlerFilter } from './filters/exception-handler.filter';
import { HTTPLoggerMiddleware } from './middlewares/http-logger.middleware';
import { ConfigFactory, validate } from './config';
import { SentryModule } from './modules/sentry/sentry.module';
import { AuthModule } from './modules/auth/auth.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AdminModule } from './modules/admin/admin.module';
import { MapsModule } from './modules/maps/maps.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RunsModule } from './modules/runs/runs.module';
import { StatsModule } from './modules/stats/stats.module';
import { UserModule } from './modules/user/user.module';
import { UsersModule } from './modules/users/users.module';
import { SessionModule } from './modules/session/session.module';
import { XpSystemsModule } from './modules/xp-systems/xp-systems.module';
import { MapReviewModule } from './modules/map-review/map-review.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // envFilePath: '../.env',
      load: [ConfigFactory],
      cache: true,
      isGlobal: true,
      validate
    }),
    SentryModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        environment: config.getOrThrow('env'),
        sentryOpts: {
          dsn: config.getOrThrow('sentry.dsn'),
          debug: false,
          tracesSampleRate: 1
        }
      }),
      inject: [ConfigService]
    }),
    FastifyMulterModule,
    AuthModule,
    ActivitiesModule,
    AdminModule,
    MapsModule,
    MapReviewModule,
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
    }
  ]
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      // Add the http logger to these paths
      .apply(HTTPLoggerMiddleware)
      .forRoutes('*');
  }
}
