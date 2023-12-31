import {
  MAX_IMAGE_SIZE,
  MAX_MAP_IMAGE_UPLOADS,
  MAX_BSP_SIZE,
  MAX_DAILY_REPORTS,
  MAX_PENDING_MAPS,
  MAX_VMF_SIZE,
  MAX_REVIEW_LENGTH,
  MAX_TESTING_REQUESTS,
  MIN_PUBLIC_TESTING_DURATION,
  MAX_CREDITS_EXCEPT_TESTERS,
  STEAM_APPIDS,
  JWT_GAME_EXPIRY_TIME,
  JWT_WEB_EXPIRY_TIME,
  JWT_REFRESH_EXPIRY_TIME
} from '@momentum/constants';
import { ConfigInterface, Environment } from './config.interface';

export const ConfigFactory = (): ConfigInterface => {
  const env: Environment = process.env['NODE_ENV'] as Environment;
  const port: number = +(process.env['NODE_PORT'] ?? 3000);

  const isProd = env === Environment.PRODUCTION;
  const isTest = env === Environment.TEST;

  return {
    env: env,
    port: port,
    url: process.env['BASE_URL'] ?? `http://localhost:${port}`,
    domain: isProd ? 'momentum-mod.org' : 'localhost',
    appIDs: STEAM_APPIDS,
    jwt: {
      secret: process.env['JWT_SECRET'] ?? '',
      expTime: JWT_WEB_EXPIRY_TIME,
      gameExpTime: JWT_GAME_EXPIRY_TIME,
      refreshExpTime: JWT_REFRESH_EXPIRY_TIME
    },
    sentry: {
      dsn: process.env['SENTRY_DSN'] ?? ''
    },
    sessionSecret: process.env['SESSION_SECRET'] ?? '',
    steam: {
      webAPIKey: process.env['STEAM_WEB_API_KEY'] ?? "This won't work!!",
      preventLimited: process.env['STEAM_PREVENT_LIMITED'] !== 'false' ?? true,
      useSteamTicketLibrary:
        process.env['STEAM_USE_ENCRYPTED_TICKETS'] === 'true' ?? false,
      ticketsSecretKey: ''
    },
    storage: {
      endpointUrl:
        process.env['IS_DOCKERIZED_API'] === 'true'
          ? process.env['STORAGE_ENDPOINT_URL_DOCKERIZED'] ?? ''
          : process.env['STORAGE_ENDPOINT_URL'] ?? '',
      region: process.env['STORAGE_REGION'] ?? '',
      bucketName: process.env['STORAGE_BUCKET_NAME'] ?? '',
      accessKeyID: process.env['STORAGE_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['STORAGE_SECRET_ACCESS_KEY'] ?? ''
    },
    limits: {
      dailyReports: MAX_DAILY_REPORTS,
      mapImageUploads: MAX_MAP_IMAGE_UPLOADS,
      pendingMaps: MAX_PENDING_MAPS,
      // Keep low for tests, as we'll be generating buffers of slightly
      // above this size to test make file size validation
      bspSize: isTest ? 1e6 : MAX_BSP_SIZE,
      vmfSize: isTest ? 1e6 : MAX_VMF_SIZE,
      imageSize: isTest ? 1e6 : MAX_IMAGE_SIZE,
      reviewLength: MAX_REVIEW_LENGTH,
      testingRequests: MAX_TESTING_REQUESTS,
      minPublicTestingDuration: MIN_PUBLIC_TESTING_DURATION,
      maxCreditsExceptTesters: MAX_CREDITS_EXCEPT_TESTERS
    }
  };
};

export const Config: ConfigInterface = ConfigFactory();
