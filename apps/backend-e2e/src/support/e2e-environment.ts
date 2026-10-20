import { after, before, mock } from 'node:test';
import { faker } from '@faker-js/faker';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  MAPLIST_UPDATE_JOB_NAME,
  MapListService
} from 'apps/backend/src/app/modules/maps/map-list.service';
import globalSetup, { nukeDb, nukeS3, nukeValkey } from './global-setup';
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
import multipart from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AddressInfo } from 'node:net';
import { PrismaClient } from '@momentum/db';
import Valkey from 'iovalkey';
// https://github.com/nrwl/nx/issues/1098#issuecomment-691542724
import { AppModule } from '../../../backend/src/app/app.module';
import { VALIDATION_PIPE_CONFIG } from '../../../backend/src/app/dto';
import { WebsocketAdapter } from '../../../backend/src/app/modules/websockets/websocket.adapter';
import { WebsocketService } from '../../../backend/src/app/modules/websockets/websocket.service';
import { PrismaPg } from '@prisma/adapter-pg';

export interface E2EUtils {
  app: NestFastifyApplication;
  server: Server;
  prisma: PrismaClient;
  valkey: Valkey;
  req: RequestUtil;
  db: DbUtil;
  auth: AuthUtil;
  fileStore: FileStoreUtil;
  // Base URL for the game WebSocket gateway, only set when `websockets: true`
  // was passed to setupE2ETestEnvironment (the app then listens on a real port).
  wsUrl?: string;
}

export interface E2ESetupOptions {
  // When true, install the WebSocket adapter and bind a real port so a `ws`
  // client can connect to the game gateway. The default (inject-only) setup has
  // no listening socket, so WebSocket upgrades can't happen.
  websockets?: boolean;
}

// This needs to mirror backend's main.ts!!
export async function setupE2ETestEnvironment(
  moduleOverrides?: (
    moduleBuilder: TestingModuleBuilder
  ) => TestingModuleBuilder,
  options?: E2ESetupOptions
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

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v'
  });

  // Anything put in a query/body that doesn't correspond to a
  // decorator-validated property on the DTO will error.
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_CONFIG));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // The WebSocket adapter doesn't support Nest DI, so resolve its dependencies
  // and pass them in directly (same as main.ts).
  if (options?.websockets) {
    app.useWebSocketAdapter(
      new WebsocketAdapter(app, app.get(WebsocketService), app.get(JwtService))
    );
  }

  const configService = app.get(ConfigService);
  await app.register(fastifyCookie, {
    secret: configService.get<string>('sessionSecret')
  });

  await app.register(multipart);

  let wsUrl: string | undefined;
  if (options?.websockets) {
    // WebSocket upgrades only fire on a real listening socket, so bind a random
    // free port (rather than the inject-only `app.init()` other suites use).
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    wsUrl = `ws://127.0.0.1:${port}/game`;
  } else {
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }

  for (const job of app.get(SchedulerRegistry).getCronJobs().values()) {
    await job.stop();
  }

  const server = app.getHttpServer();

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: [
      {
        level: 'error', // change to 'query' to debug queries!
        emit: 'stdout'
      }
    ]
  });

  const valkey = new Valkey({
    port: configService.getOrThrow('valkey.port'),
    host: configService.getOrThrow('valkey.host')
  });

  const auth = new AuthUtil();
  return {
    app,
    server,
    prisma,
    valkey,
    auth,
    db: new DbUtil(prisma, auth),
    req: new RequestUtil(app),
    fileStore: new FileStoreUtil(),
    wsUrl
  };
}

export async function teardownE2ETestEnvironment(
  app: NestFastifyApplication,
  prisma: PrismaClient
) {
  await app.close();
  await prisma.$disconnect();
}

let globalSetupPromise: Promise<void> | undefined;
let environmentPromise: Promise<E2EUtils> | undefined;
let environment: E2EUtils | undefined;

export let app: E2EUtils['app'];
export let server: E2EUtils['server'];
export let prisma: E2EUtils['prisma'];
export let valkey: E2EUtils['valkey'];
export let req: E2EUtils['req'];
export let db: E2EUtils['db'];
export let auth: E2EUtils['auth'];
export let fileStore: E2EUtils['fileStore'];
export let wsUrl: string;
export let checkScheduledMapListUpdates: () => Promise<void>;

export function registerE2ETestRunnerHooks(): void {
  before(async () => {
    await ensureGlobalSetup();
  });

  after(async () => {
    await closeSharedE2ETestEnvironment();
  });
}

export function registerE2ETestFile(): void {
  before(async () => {
    faker.seed(1);
    await getSharedE2ETestEnvironment();
  });

  after(async () => {
    try {
      // We could reset nuke after every individual test file but slows us down,
      // not that hard to clean up after ourselves.
      const env = await getSharedE2ETestEnvironment();
      mock.restoreAll();
      await nukeDb(env.prisma);
      await nukeValkey();
      await nukeS3();
      await env.app.get(MapListService)['updateVersionsFromFileStore']();
    } finally {
      if (process.env['MOMENTUM_E2E_TEST_FILES'] === undefined) {
        await closeSharedE2ETestEnvironment();
      }
    }
  });
}

export async function getSharedE2ETestEnvironment(): Promise<E2EUtils> {
  await ensureGlobalSetup();

  // The shared app must include the WebSocket adapter for the session suite.
  environmentPromise ??= setupE2ETestEnvironment(undefined, {
    websockets: true
  });
  environment = await environmentPromise;

  app = environment.app;
  server = environment.server;
  prisma = environment.prisma;
  valkey = environment.valkey;
  req = environment.req;
  db = environment.db;
  auth = environment.auth;
  fileStore = environment.fileStore;
  if (!environment.wsUrl) {
    throw new Error('WebSocket test environment did not provide a URL');
  }
  wsUrl = environment.wsUrl;
  checkScheduledMapListUpdates = environment.app
    .get(SchedulerRegistry)
    .getCronJob(MAPLIST_UPDATE_JOB_NAME).fireOnTick;

  return environment;
}

async function ensureGlobalSetup(): Promise<void> {
  globalSetupPromise ??= globalSetup();
  await globalSetupPromise;
}

async function closeSharedE2ETestEnvironment(): Promise<void> {
  const env = environment;
  if (!env) return;

  environment = undefined;
  environmentPromise = undefined;

  try {
    await teardownE2ETestEnvironment(env.app, env.prisma);
  } finally {
    await env.valkey.quit();
  }
}
