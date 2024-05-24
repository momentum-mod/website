import { Server } from 'node:http';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import { Reflector } from '@nestjs/core';
import {
  AuthUtil,
  DbUtil,
  FileStoreUtil,
  RequestUtil
} from '@momentum/test-utils';
import fastifyCookie from '@fastify/cookie';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
// https://github.com/nrwl/nx/issues/1098#issuecomment-691542724
import { AppModule } from '../../../backend/src/app/app.module';
import { VALIDATION_PIPE_CONFIG } from '../../../backend/src/app/dto';

export interface E2EUtils {
  app: NestFastifyApplication;
  server: Server;
  prisma: PrismaClient;
  req: RequestUtil;
  db: DbUtil;
  auth: AuthUtil;
  fileStore: FileStoreUtil;
}

export async function setupE2ETestEnvironment(
  moduleOverrides?: (
    moduleBuilder: TestingModuleBuilder
  ) => TestingModuleBuilder
): Promise<E2EUtils> {
  BigInt.prototype['toJSON'] = function () {
    return this.toString();
  };

  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule]
  });
  if (moduleOverrides) moduleBuilder = moduleOverrides(moduleBuilder);
  const moduleRef = await moduleBuilder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
    { bufferLogs: true, rawBody: true }
  );

  app.useBodyParser('application/octet-stream', { bodyLimit: 1e8 });

  app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v'
  });

  // Anything put in a query/body that doesn't correspond to a
  // decorator-validated property on the DTO will error.
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_CONFIG));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const configService = app.get(ConfigService);
  await app.register(fastifyCookie, {
    secret: configService.get('sessionSecret')
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const server = app.getHttpServer();
  // Uncomment to output Prisma's raw queries
  // const prisma = new PrismaClient({ log: [{ level: 'query', emit: 'stdout' }] });
  const prisma = new PrismaClient();
  const auth = new AuthUtil();
  return {
    app,
    server,
    prisma,
    auth,
    db: new DbUtil(prisma, auth),
    req: new RequestUtil(app),
    fileStore: new FileStoreUtil()
  };
}

export async function teardownE2ETestEnvironment(app: NestFastifyApplication) {
  await app.close();
}
