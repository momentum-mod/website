import { Module, RequestMethod, VERSION_NEUTRAL } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule, Params as PinoParams } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
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
import { GameConnectionModule } from './modules/game-connection/game-connection.module';
import { TwitchModule } from './modules/twitch/twitch.module';
import { pick } from '@momentum/util-fn';
import { ValkeyModule } from './modules/valkey/valkey.module';
import { ValkeyService } from './modules/valkey/valkey.service';
import { ValkeyThrottlerStorage } from './modules/valkey/valkey-throttler-storage';
import { WebsocketsModule } from './modules/websockets/websockets.module';
import { IncomingMessage, ServerResponse } from 'node:http';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [ConfigFactory],
      cache: true,
      isGlobal: true,
      validate
    }),
    // Per-endpoint rate limiting.
    ThrottlerModule.forRootAsync({
      imports: [ValkeyModule],
      inject: [ConfigService, ValkeyService],
      useFactory: (config: ConfigService, valkey: ValkeyService) => ({
        throttlers:
          config.getOrThrow('env') === Environment.PRODUCTION
            ? [
                {
                  ttl: seconds(config.getOrThrow('throttle.ttl')),
                  limit: config.getOrThrow('throttle.limit')
                }
              ]
            : [],
        storage: new ValkeyThrottlerStorage(valkey)
      })
    }),
    SentryModule.forRoot(),
    // Pino is a JSON-based logger that's much more performant than the NestJS's
    // built-in logger.
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<PinoParams> => ({
        // nestjs-pino's default route gets prefixed with our default URI
        // version, so it only logs requests under /v1. VERSION_NEUTRAL mounts
        // it at the root, covering version-neutral controllers (auth) and
        // unmatched paths too. Healthchecks are excluded as they're constantly
        // polled.
        forRoutes: [
          {
            path: '{*splat}',
            method: RequestMethod.ALL,
            version: VERSION_NEUTRAL
          }
        ],
        exclude: [
          {
            path: 'health',
            method: RequestMethod.ALL,
            version: VERSION_NEUTRAL
          }
        ],
        pinoHttp: {
          level: config.getOrThrow('logLevel'),
          // Name request logs by endpoint rather than "request completed".
          customSuccessMessage: requestLogMessage,
          customErrorMessage: requestLogMessage,
          // In dev mode, output human-readable strings using `pino-pretty`,
          // filtering out most HTTP header noise. In production we log JSON to
          // stdout, and Sentry's `pinoIntegration` (see instrumentation.ts)
          // forwards logs to Sentry.
          ...(config.getOrThrow('env') !== Environment.PRODUCTION
            ? {
                serializers: {
                  req: (req) => pick(req, ['method', 'url']),
                  res: (res) => pick(res, ['statusCode'])
                },
                transport: {
                  target: 'pino-pretty',
                  options: { singleLine: true },
                  // The transport runs in a worker thread, which would
                  // otherwise repeat our `node -r ...` preloads (e.g. loading
                  // the whole TypeScript compiler a second time with ts-node).
                  worker: { execArgv: [] }
                }
              }
            : {})
        }
      })
    }),
    ScheduleModule.forRoot(),
    DbModule,
    ValkeyModule,
    WebsocketsModule,
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
    HealthcheckModule,
    GameConnectionModule,
    TwitchModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionHandlerFilter
    }
  ]
})
export class AppModule {}

function requestLogMessage(req: IncomingMessage, res: ServerResponse): string {
  return `${req.method} ${req.url?.split('?')[0]} [${res.statusCode}]`;
}
