import {
  MAX_MAP_IMAGES,
  MAX_BSP_SIZE,
  MAX_DAILY_REPORTS,
  MAX_VMF_SIZE,
  MAX_REVIEW_LENGTH,
  MAX_TEST_INVITES,
  MIN_PUBLIC_TESTING_DURATION,
  MAX_CREDITS_EXCEPT_TESTERS,
  STEAM_APPIDS,
  JWT_GAME_EXPIRY_TIME,
  JWT_WEB_EXPIRY_TIME,
  JWT_REFRESH_EXPIRY_TIME,
  MAX_MAP_IMAGE_SIZE
} from '@momentum/constants';
import { ConfigInterface, Environment } from './config.interface';
import * as process from 'node:process';

export const ConfigFactory = (): ConfigInterface => {
  const env: Environment = process.env['NODE_ENV'] as Environment;
  const port: number = +(process.env['NEST_PORT'] || 3000);

  const isProd = env === Environment.PRODUCTION;
  const isTest = env === Environment.TEST;

  return {
    env,
    port,
    domain: process.env['ROOT_DOMAIN'] || 'localhost',
    url: {
      backend: process.env['BACKEND_URL'] || `http://localhost:${port}`,
      frontend: process.env['FRONTEND_URL'] || 'http://localhost:4200'
    },
    appIDs: STEAM_APPIDS,
    jwt: {
      secret: process.env['JWT_SECRET'] || '',
      expTime: JWT_WEB_EXPIRY_TIME,
      gameExpTime: JWT_GAME_EXPIRY_TIME,
      refreshExpTime: JWT_REFRESH_EXPIRY_TIME
    },
    sentry: {
      dsn: process.env['SENTRY_DSN'] || '',
      enableTracing: process.env['SENTRY_ENABLE_TRACING'] === 'true' || false,
      tracesSampleRate: +process.env['SENTRY_TRACE_SAMPLE_RATE'] || 0,
      tracePrisma: process.env['SENTRY_TRACE_PRISMA'] === 'true' || false
    },
    sessionSecret: process.env['SESSION_SECRET'] || '',
    steam: {
      webAPIKey: process.env['STEAM_WEB_API_KEY'] || "This won't work!!",
      preventLimited: process.env['STEAM_PREVENT_LIMITED'] !== 'false' || true,
      useSteamTicketLibrary:
        process.env['STEAM_USE_ENCRYPTED_TICKETS'] === 'true' || false,
      ticketsSecretKey: process.env['STEAM_TICKETS_SECRET'] ?? ''
    },
    storage: {
      endpointUrl: process.env['STORAGE_ENDPOINT_URL'] || '',
      region: process.env['STORAGE_REGION'] || '',
      bucketName: process.env['STORAGE_BUCKET_NAME'] || '',
      accessKeyID: process.env['STORAGE_ACCESS_KEY_ID'] || '',
      secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY'] || ''
    },
    limits: {
      dailyReports: MAX_DAILY_REPORTS,
      mapImageUploads: MAX_MAP_IMAGES,
      // Keep low for tests, as we'll be generating buffers of slightly
      // above this size to test make file size validation
      bspSize: isTest ? 1e6 : MAX_BSP_SIZE,
      vmfSize: isTest ? 1e6 : MAX_VMF_SIZE,
      imageSize: isTest ? 1e6 : MAX_MAP_IMAGE_SIZE,
      reviewLength: MAX_REVIEW_LENGTH,
      testInvites: MAX_TEST_INVITES,
      minPublicTestingDuration: MIN_PUBLIC_TESTING_DURATION,
      maxCreditsExceptTesters: MAX_CREDITS_EXCEPT_TESTERS
    }
  };
};

// Export the actual Config object so DTOs can use it - we don't have any way
// for them to use Nest's ConfigModule
export const Config: ConfigInterface = ConfigFactory();
