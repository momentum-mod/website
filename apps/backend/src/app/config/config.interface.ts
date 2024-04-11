﻿export enum Environment {
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
  TEST = 'test'
}

export interface ConfigInterface {
  env: Environment;
  domain: string;
  port: number;
  appIDs: number[];
  jwt: {
    secret: string;
    expTime: string;
    gameExpTime: string;
    refreshExpTime: string;
  };
  steam: {
    webAPIKey: string;
    preventLimited: boolean;
    useSteamTicketLibrary: boolean;
    ticketsSecretKey: string;
  };
  sessionSecret: string;
  storage: {
    region: string;
    endpointUrl: string;
    bucketName: string;
    accessKeyID: string;
    secretAccessKey: string;
  };
  sentry: {
    dsn: string;
    enableTracing: boolean;
    tracesSampleRate: number;
    tracePrisma: boolean;
  };
  limits: {
    dailyReports: number;
    mapImageUploads: number;
    bspSize: number;
    vmfSize: number;
    imageSize: number;
    reviewLength: number;
    testInvites: number;
    minPublicTestingDuration: number;
    maxCreditsExceptTesters: number;
  };
}
