import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised! // TODO: Is this doing anything
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { ClassSerializerInterceptor, INestApplication, Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '@modules/repo/prisma.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Reflector } from '@nestjs/core';
import { Server } from 'node:http';
import { DbUtil } from '@tests/util/db.util';
import { AuthUtil } from '@tests/util/auth.util';
import { RequestUtil } from '@tests/util/request.util';
import { AuthService } from '@modules/auth/auth.service';
import { FileStoreUtil } from '@tests/util/s3.util';
import fastifyCookie from '@fastify/cookie';
import { ConfigService } from '@nestjs/config';

export interface E2EUtils {
    app: INestApplication;
    server: Server;
    prisma: PrismaService;
    req: RequestUtil;
    db: DbUtil;
    auth: AuthUtil;
    fs: FileStoreUtil;
}

export async function setupE2ETestEnvironment(
    moduleOverrides?: (moduleBuilder: TestingModuleBuilder) => TestingModuleBuilder
): Promise<E2EUtils> {
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const logger = new Logger().localInstance;
    const logLevel: LogLevel[] = ['error'];
    // Env var for heavier debugging. In WebStorm it's useful to have this in the env var settings for your
    // default configuration but *not* your main test configuration so it doesn't spam when running everything,
    // but is enabled for when you run specific tests.
    if (process.env.TEST_LOG_DEBUG === 'true') logLevel.push('debug', 'warn');
    logger.setLogLevels(logLevel);

    let moduleBuilder = await Test.createTestingModule({ imports: [AppModule] }).setLogger(logger);
    if (moduleOverrides) moduleBuilder = moduleOverrides(moduleBuilder);
    const moduleRef = await moduleBuilder.compile();

    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
    app.useBodyParser('application/octet-stream', { bodyLimit: 2e3 });

    app.getHttpAdapter()
        .getInstance()
        .addHook('onRequest', (request, reply, done) => {
            reply.setHeader = function (key, value) {
                return this.raw.setHeader(key, value);
            };
            reply.end = function () {
                this.raw.end();
            };
            request.res = reply;
            done();
        });

    const configService = app.get(ConfigService);
    app.register(fastifyCookie, { secret: configService.get('sessionSecret') });

    // Anything put in a query/body that doesn't correspond to a decorator-validated property on the DTO will error.
    app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });

    await app.init();
    await app.getHttpAdapter().getInstance().listen();

    const server = app.getHttpServer();
    const prisma = app.get(PrismaService);
    const auth = new AuthUtil(app.get(AuthService));
    return {
        app,
        server,
        prisma,
        auth,
        db: new DbUtil(prisma, auth),
        req: new RequestUtil(server),
        fs: new FileStoreUtil()
    };
}

export async function teardownE2ETestEnvironment(app: INestApplication) {
    const prisma = app.get(PrismaService);
    await app.close();
    await prisma.$disconnect();
}
