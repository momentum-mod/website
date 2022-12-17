import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised!
import NodeEnvironment from 'jest-environment-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { ClassSerializerInterceptor, INestApplication, Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '@modules/repo/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import { XpSystemsService } from '@modules/xp-systems/xp-systems.service';
import { appOptions } from '@/main';
import { Reflector } from '@nestjs/core';

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

        const app = moduleRef.createNestApplication(appOptions);

        // Anything put in a query/body that doesn't correspond to a decorator-validated property on the DTO will error.
        app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

        app.setGlobalPrefix('api', { exclude: ['auth'] });

        const prismaDalc: PrismaService = app.get(PrismaService);
        await prismaDalc.enableShutdownHooks(app);

        await app.init();

        this.global.app = app;
        this.global.server = app.getHttpServer();
        this.global.prisma = app.get(PrismaService);
        this.global.auth = app.get(AuthService);
        this.global.xpSystems = app.get(XpSystemsService);
    }

    async teardown() {
        // TODO: Isn't actually doing anything! I have no idea why not!
        await (this.global.app as INestApplication).close();
        await (this.global.prisma as PrismaService).$disconnect();
        await super.teardown();
    }
}
