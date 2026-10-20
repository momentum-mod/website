import { after, before, mock } from 'node:test';
import { faker } from '@faker-js/faker';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MAPLIST_UPDATE_JOB_NAME } from 'apps/backend/src/app/modules/maps/map-list.service';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './environment';
import type { E2EUtils } from './environment';
import globalSetup, { nukeDb } from './global-setup';

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
      const env = await getSharedE2ETestEnvironment();
      mock.restoreAll();
      await nukeDb(env.prisma);
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
