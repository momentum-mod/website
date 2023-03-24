import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised!
import NodeEnvironment from 'jest-environment-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { ClassSerializerInterceptor, INestApplication, Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '@modules/repo/prisma.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuthService } from '@modules/auth/auth.service';
import { XpSystemsService } from '@modules/xp-systems/xp-systems.service';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

export default class E2ETestEnvironment extends NodeEnvironment {
    constructor(config, context) {
        super(config, context);
    }

    async setup() {
        await super.setup();

        BigInt.prototype['toJSON'] = function () {
            return this.toString();
        };

        this.global.prisma = new PrismaClient();

        const logger = new Logger().localInstance;
        const logLevel: LogLevel[] = ['error'];
        // Env var for heavier debugging. In WebStorm it's useful to have this in the env var settings for your
        // default configuration but *not* your main test configuration so it doesn't spam when running everything,
        // but is enabled for when you run specific tests.
        if (process.env.TEST_LOG_DEBUG === 'true') logLevel.push('debug', 'warn');
        logger.setLogLevels(logLevel);

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .setLogger(logger)
            // Override the global Prisma client with our global instance. Note we're also avoiding shutdown hooks here.
            .overrideProvider(PrismaService)
            .useValue(this.global.prisma)
            .compile();

        const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });

        // Anything put in a query/body that doesn't correspond to a decorator-validated property on the DTO will error.
        app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

        app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });

        await app.init();
        await app.getHttpAdapter().getInstance().listen();

        this.global.app = app;
        this.global.server = app.getHttpServer();
        this.global.auth = app.get(AuthService);
        this.global.xpSystems = app.get(XpSystemsService);
    }

    async teardown() {
        const app = this.global.app as INestApplication;

        await app.close();

        await super.teardown();
    }
}
