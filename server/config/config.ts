import { ConfigInterface, Environment } from './config.interface';
import * as path from 'path';

export const ConfigFactory = (): ConfigInterface => {
    const env: Environment = process.env.NODE_ENV as Environment;
    const port: number = +process.env.NODE_PORT;

    const isProd = env === Environment.Production;
    const useRemoteStorage = process.env.USE_LOCAL_STORAGE === 'true' ?? true;

    // If we're not in production some stuff being missing in fine, can we just use sensible defaults.
    // In production we want to require them be defined, so they'll fail validation immediately if not.
    const defaults = {
        url: !isProd ? `http://localhost:${port}` : undefined,
        secret: !isProd ? 'dev' : undefined,
        social: !isProd
            ? {
                  id: 'thiswontwork123',
                  secret: 'setupanapikeyifyouneedthistowork!!'
              }
            : {
                  id: undefined,
                  secret: undefined
              },
        // If we're using remote storage, require these be defined - undefined will fail validation.
        storage: useRemoteStorage
            ? {
                  region: '',
                  endpointURL: '',
                  bucketName: '',
                  accessKeyID: '',
                  secretAccessKey: ''
              }
            : {
                  region: undefined,
                  endpointURL: undefined,
                  bucketName: undefined,
                  accessKeyID: undefined,
                  secretAccessKey: undefined
              }
    };

    return {
        env: env,
        root: path.normalize(__dirname + '/..'), // TODO: Might not be needed,
        port: port,
        url: {
            base: process.env.BASE_URL ?? defaults.url,
            api: process.env.API_URL ?? defaults.url,
            auth: process.env.AUTH_URL ?? defaults.url,
            cdn: process.env.CDN_URL ?? defaults.url
        },
        appIDs: [669270, 1802710],
        accessToken: {
            secret: process.env.JWT_SECRET ?? defaults.secret,
            expTime: '15m',
            gameExpTime: '24h',
            refreshExpTime: '5d',
            gameRefreshExpTime: '5d'
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
        domain: isProd ? 'momentum-mod.org' : 'localhost',
        sentry: {
            dsn: process.env.SENTRY_DSN || '',
            perfTracking: process.env.SENTRY_PERF_TRACKING === 'true' || false
        },
        sessionSecret: isProd ? process.env.EXPRESS_SESSION_SECRET : 'keyboard cat',
        steam: {
            webAPIKey: process.env.STEAM_WEB_API_KEY,
            preventLimited: process.env.STEAM_PREVENT_LIMITED === 'true' ?? true,
            useEncryptedTickets: process.env.STEAM_USE_ENCRYPTED_TICKETS === 'true' ?? false,
            useSteamTicketLibrary: process.env.STEAM_USE_ENCRYPTED_TICKETS === 'true' ?? true,
            ticketsSecretKey: ''
        },
        storage: {
            useLocal: useRemoteStorage,
            endpointURL: process.env.STORAGE_ENDPOINT_URL ?? defaults.storage.endpointURL,
            region: process.env.STORAGE_REGION ?? defaults.storage.region,
            bucketName: process.env.STORAGE_BUCKET_NAME ?? defaults.storage.bucketName,
            accessKeyID: process.env.STORAGE_ACCESS_KEY_ID ?? defaults.storage.accessKeyID,
            secretAccessKey: process.env.STORAGE_ACCESS_KEY_ID ?? defaults.storage.secretAccessKey
        }
    };
};

export const Config: ConfigInterface = ConfigFactory();
