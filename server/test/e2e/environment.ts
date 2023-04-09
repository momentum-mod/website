import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised! // TODO: Is this doing anything
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { ClassSerializerInterceptor, Logger, LogLevel, ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaService } from '@modules/repo/prisma.service';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Reflector } from '@nestjs/core';
import { Server } from 'node:http';
import { DbUtil } from '@test/util/db.util';
import { AuthUtil } from '@test/util/auth.util';
import { RequestUtil } from '@test/util/request.util';
import { JwtAuthService } from '@modules/auth/jwt/jwt-auth.service';
import { FileStoreUtil } from '@test/util/s3.util';
import fastifyCookie from '@fastify/cookie';
import { ConfigService } from '@nestjs/config';

export interface E2EUtils {
    app: NestFastifyApplication;
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

    app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

    // Anything put in a query/body that doesn't correspond to a decorator-validated property on the DTO will error.
    app.useGlobalPipes(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    const configService = app.get(ConfigService);
    await app.register(fastifyCookie, { secret: configService.get('sessionSecret') });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const server = app.getHttpServer();
    const prisma = app.get(PrismaService);
    const auth = new AuthUtil(app.get(JwtAuthService));
    return {
        app,
        server,
        prisma,
        auth,
        db: new DbUtil(prisma, auth),
        req: new RequestUtil(app),
        fs: new FileStoreUtil()
    };
}

export async function teardownE2ETestEnvironment(app: NestFastifyApplication) {
    const prisma = app.get(PrismaService);
    await app.close();
    await prisma.$disconnect();
}
