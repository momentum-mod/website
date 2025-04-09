import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule, Params as PinoParams } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SentryModule } from '@sentry/nestjs/setup';
import { ScheduleModule } from '@nestjs/schedule';
import { ExceptionHandlerFilter } from './filters/exception-handler.filter';
import { ConfigFactory, Environment, validate } from './config';
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
import { DbModule } from './modules/database/db.module';
import { KillswitchModule } from './modules/killswitch/killswitch.module';
import { HealthcheckModule } from './modules/healthcheck/healthcheck.module';
import { pick } from '@momentum/util-fn';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [ConfigFactory],
      cache: true,
      isGlobal: true,
      validate
    }),
    SentryModule.forRoot(),
    // Pino is a JSON-based logger that's much more performant than the NestJS's
    // built-in logger.
    LoggerModule.forRootAsync({
      useFactory: async (config: ConfigService): Promise<PinoParams> => ({
        pinoHttp: {
          level: config.getOrThrow('logLevel'),
          // In dev mode, output human-readable strings using `pino-pretty`,
          // filtering out most HTTP header noise.
          ...(config.getOrThrow('env') !== Environment.PRODUCTION
            ? {
                serializers: {
                  req: (req) => pick(req, ['method', 'url']),
                  res: (res) => pick(res, ['statusCode'])
                },
                transport: {
                  target: 'pino-pretty',
                  options: { singleLine: true }
                }
              }
            : {})
        }
      }),
      inject: [ConfigService]
    }),
    ScheduleModule.forRoot(),
    DbModule,
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
    XpSystemsModule,
    KillswitchModule,
    HealthcheckModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionHandlerFilter
    }
  ]
})
export class AppModule {}
