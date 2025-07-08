import { GamemodeCategory } from '@momentum/constants';
import * as pino from 'pino';

export enum Environment {
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
  TEST = 'test'
}

export interface ConfigInterface {
  env: Environment;
  domain: string;
  url: {
    backend: string;
    frontend: string;
    cdn: string;
  };
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
    webAPIUrl: string;
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
    preSignedUrlExpTime: number;
  };
  discord: {
    token: string;
    guild: string;
    contentApprovalChannel: string;
    portingChannel: string;
    statusChannels: Record<GamemodeCategory, string>;
  };
  mapListUpdateSchedule: string;
  logLevel: pino.LevelWithSilent;
}
