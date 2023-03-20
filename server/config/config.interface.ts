export enum Environment {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
    TEST = 'test'
}

export interface Config {
    env: Environment;
    root: string;
    url: {
        base: string;
        api: string;
        auth: string;
        cdn: string;
    };
    domain: string;
    port: number;
    appIDs: number[];
    accessToken: {
        secret: string;
        expTime: string;
        gameExpTime: string;
        refreshExpTime: string;
    };
    discord: {
        clientID: string;
        clientSecret: string;
    };
    twitch: {
        clientID: string;
        clientSecret: string;
    };
    twitter: {
        consumerKey: string;
        consumerSecret: string;
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
        maxDailyReports: number;
    };
}
