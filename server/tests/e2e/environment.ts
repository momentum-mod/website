import NodeEnvironment from 'jest-environment-node';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { ClassSerializerInterceptor, Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../src/modules/repo/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { XpSystemsService } from '../../src/modules/xp-systems/xp-systems.service';

export default class E2ETestEnvironment extends NodeEnvironment {
    constructor(config, context) {
        super(config, context);
    }

    async setup() {
        await super.setup();

        const logger = new Logger().localInstance;
        const logLevel: LogLevel[] = ['error'];
        // Env var for heavier debugging. In WebStorm it's useful to have this in the env var settings for your
        // default configuration but *not* your main test configuration so it doesn't spam when running everything,
        // but is enabled for when you run specific tests
        if (process.env.TEST_LOG_DEBUG === 'true') logLevel.push('debug', 'warn');
        logger.setLogLevels(logLevel);

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .setLogger(logger)
            .compile();

        BigInt.prototype['toJSON'] = function () {
            return this.toString();
        };

        const app = moduleRef.createNestApplication();

        app.useGlobalPipes(new ValidationPipe({ transform: true, enableDebugMessages: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

        await app.init();

        this.global.app = app;
        this.global.server = app.getHttpServer();
        this.global.prisma = app.get(PrismaService);
        this.global.auth = app.get(AuthService);
        this.global.xpSystems = app.get(XpSystemsService);
    }

    async teardown() {
        await super.teardown();
    }
}
