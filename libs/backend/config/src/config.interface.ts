export enum Environment {
  DEVELOPMENT = 'dev',
  PRODUCTION = 'prod',
  TEST = 'test'
}

export interface ConfigInterface {
  env: Environment;
  url: string;
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
  };
  limits: {
    dailyReports: number;
    mapImageUploads: number;
    pendingMaps: number;
    bspSize: number;
    vmfSize: number;
    imageSize: number;
    reviewLength: number;
    testingRequests: number;
  };
}
