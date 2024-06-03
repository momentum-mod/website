import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FastifyMulterModule } from '@nest-lab/fastify-multer';
import { ExceptionHandlerFilter } from './filters/exception-handler.filter';
import { ConfigFactory, Environment, validate } from './config';
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
import { ExtendedPrismaService } from './modules/database/prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from './modules/database/db.constants';
import { DbModule } from './modules/database/db.module';
import { KillswitchModule } from './modules/killswitch/killswitch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [ConfigFactory],
      cache: true,
      isGlobal: true,
      validate
    }),
    // We use Sentry in production for error logging and performance tracing.
    // This is a small wrapper module around @sentry/node that only inits in
    // production if a valid DSN is set.
    SentryModule.forRootAsync({
      useFactory: async (
        config: ConfigService,
        prisma: ExtendedPrismaService
      ) => ({
        environment: config.getOrThrow('env'),
        // Whether to enable SentryInterceptor. If enabled, we run a transaction
        // for the lifetime of tracesSampleRate * all HTTP requests. This
        // provides more detailed error
        enableTracing: config.getOrThrow('sentry.enableTracing'),
        sentryOpts: {
          // If this isn't set in prod we won't init Sentry.
          dsn: config.getOrThrow('sentry.dsn'),
          tracesSampleRate: config.getOrThrow('sentry.tracesSampleRate'),
          integrations: config.getOrThrow('sentry.tracePrisma')
            ? [new Sentry.Integrations.Prisma({ client: prisma })]
            : undefined,
          debug: false
        }
      }),
      imports: [DbModule.forRoot()],
      inject: [ConfigService, EXTENDED_PRISMA_SERVICE]
    }),
    // Pino is a highly performant logger that outputs logs as JSON, which we
    // then export to Grafana Loki. This module sets up `pino-http` which logs
    // all HTTP requests (so no need for a Nest interceptor).
    // In dev mode, outputs as more human-readable strings using `pino-pretty`.
    LoggerModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        pinoHttp: {
          customProps: (_req, _res) => ({ context: 'HTTP' }),
          level: config.getOrThrow('logLevel'),
          transport:
            config.getOrThrow('env') !== Environment.PRODUCTION
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true }
                }
              : undefined
        }
      }),
      inject: [ConfigService]
    }),
    FastifyMulterModule,
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
    KillswitchModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ExceptionHandlerFilter
    }
  ]
})
export class AppModule {}
