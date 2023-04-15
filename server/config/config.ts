import { Config as ConfigInterface, Environment } from './config.interface';
import * as path from 'node:path';

export const ConfigFactory = (): ConfigInterface => {
    const env: Environment = process.env.NODE_ENV as Environment;
    const port: number = +process.env.NODE_PORT;

    const isProd = env === Environment.PRODUCTION;
    const isTest = env === Environment.TEST;

    // If we're not in production some stuff being missing in fine, we can just use sensible defaults.
    // In production we want to require them be defined, so they'll fail validation immediately if not.
    const defaults = {
        url: !isProd ? `http://localhost:${port}` : undefined,
        cdnUrl: !isProd ? 'http://localhost:9000' : undefined,
        secret: !isProd ? 'dev' : undefined,
        social: !isProd
            ? {
                  id: 'thiswontwork123',
                  secret: 'setupanapikeyifyouneedthistowork!!'
              }
            : {
                  id: undefined,
                  secret: undefined
              }
    };

    return {
        env: env,
        root: path.normalize(__dirname + '/..'), // TODO: Might not be needed,
        port: port,
        url: process.env.BASE_URL ?? !isProd ? `http://localhost:${port}` : undefined,
        domain: isProd ? 'momentum-mod.org' : 'localhost',
        appIDs: [669270, 1802710],
        jwt: {
            secret: process.env.JWT_SECRET ?? defaults.secret,
            expTime: '15m',
            gameExpTime: '24h',
            refreshExpTime: '5d'
        },
        discord: {
            clientID: process.env.DISCORD_CLIENT_ID ?? defaults.social.id,
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? defaults.social.secret
        },
        twitter: {
            consumerKey: process.env.TWITTER_CONSUMER_KEY ?? defaults.social.id,
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? defaults.social.secret
        },
        twitch: {
            clientID: process.env.TWITCH_CLIENT_ID ?? defaults.social.id,
            clientSecret: process.env.TWITCH_CLIENT_SECRET ?? defaults.social.secret
        },
        sentry: {
            dsn: process.env.SENTRY_DSN
        },
        sessionSecret: isProd ? process.env.SESSION_SECRET : 'honga suggested it make some cha',
        steam: {
            webAPIKey: process.env.STEAM_WEB_API_KEY,
            preventLimited: process.env.STEAM_PREVENT_LIMITED !== 'false' ?? true,
            useSteamTicketLibrary: process.env.STEAM_USE_ENCRYPTED_TICKETS === 'true' ?? false,
            ticketsSecretKey: ''
        },
        storage: {
            endpointUrl:
                process.env.IS_DOCKERIZED_API === 'true'
                    ? process.env.STORAGE_ENDPOINT_URL_DOCKERIZED
                    : process.env.STORAGE_ENDPOINT_URL,
            region: process.env.STORAGE_REGION,
            bucketName: process.env.STORAGE_BUCKET_NAME,
            accessKeyID: process.env.STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY
        },
        limits: {
            maxDailyReports: 5,
            mapImageUploads: 5,
            // Keep low for tests, as we'll be generating buffers of slightly
            // above this size to test make file size validation
            mapSize: isTest ? 1e6 : 3e8,
            imageSize: isTest ? 1e6 : 1e7
        }
    };
};

export const Config: ConfigInterface = ConfigFactory();
