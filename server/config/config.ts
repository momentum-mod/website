import * as path from 'path';

const rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

const configs: IAllConfigs = {
    test: {
        root: rootPath,
        baseURL: 'http://localhost:3000',
        baseURL_API: 'http://localhost:3000',
        baseURL_Auth: 'http://localhost:3000',
        baseURL_CDN: 'http://localhost:3000',
        domain: 'localhost',
        port: 3000,
        appID: 669270,
        accessToken: {
            secret: 'test',
            expTime: '15m',
            gameExpTime: '24h',
            refreshExpTime: '5d',
            gameRefreshExpTime: '5d'
        },
        discord: {
            clientID: 'discord1234',
            clientSecret: 'shhhhh!'
        },
        twitch: {
            clientID: 'twitch1234',
            clientSecret: '*hey lil mama lemme whisper in your ear*'
        },
        twitter: {
            consumerKey: 'twitter12354',
            consumerSecret: '*lemme tell ya somethin youd like to hear*'
        },
        steam: {
            webAPIKey: process.env.STEAM_WEB_API_KEY ?? 'undefined',
            preventLimited: true,
            useSteamTicketLibrary: true,
            useEncryptedTickets: true,
            ticketsSecretKey: process.env.STEAM_TICKETS_SECRET
        },
        db: {
            name: 'momentum_test',
            userName: 'mom_test',
            password: 'password',
            host: 'db',
            logging: false,
            pool: {
                max: 15,
                min: 0,
                acquire: 15000,
                idle: 500
            }
        },
        session: {
            secret: 'keyboard cat'
        },
        storage: {
            region: process.env.MOM_STORAGE_REGION ?? 'undefined',
            endpointURL: process.env.MOM_STORAGE_ENDPOINT_URL ?? 'undefined',
            bucketName: process.env.MOM_STORAGE_BUCKET_NAME ?? 'undefined',
            accessKeyID: process.env.MOM_STORAGE_ACCESS_KEY_ID ?? 'undefined',
            secretAccessKey: process.env.MOM_STORAGE_SECRET_ACCESS_KEY ?? 'undefined'
        },
        sentry: {
            dsn: process.env.SENTRY_DSN ?? 'undefined',
            debug: process.env.SENTRY_DEBUG === 'true'
        }
    },
    development: {
        root: rootPath,
        baseURL: 'http://localhost:3000',
        baseURL_API: 'http://localhost:3000',
        baseURL_Auth: 'http://localhost:3000',
        baseURL_CDN: 'http://localhost:3000',
        domain: 'localhost',
        port: 3000,
        appID: 669270,
        accessToken: {
            secret: 'development',
            expTime: '15m',
            gameExpTime: '24h',
            refreshExpTime: '5d',
            gameRefreshExpTime: '5d'
        },
        discord: {
            clientID: process.env.DISCORD_CLIENT_ID ?? 'undefined',
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? 'undefined'
        },
        twitch: {
            clientID: process.env.TWITCH_CLIENT_ID ?? 'undefined',
            clientSecret: process.env.TWITCH_CLIENT_SECRET ?? 'undefined'
        },
        twitter: {
            consumerKey: process.env.TWITTER_CONSUMER_KEY ?? 'undefined',
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? 'undefined'
        },
        steam: {
            webAPIKey: process.env.STEAM_WEB_API_KEY ?? 'undefined',
            preventLimited: true,
            useSteamTicketLibrary: true,
            useEncryptedTickets: true,
            ticketsSecretKey: process.env.STEAM_TICKETS_SECRET ?? 'undefined'
        },
        db: {
            name: 'momentum',
            userName: 'mom',
            password: 'password',
            host: 'db',
            logging: console.log,
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        },
        session: {
            secret: 'keyboard cat'
        },
        storage: {
            region: process.env.MOM_STORAGE_REGION ?? 'undefined',
            endpointURL: process.env.MOM_STORAGE_ENDPOINT_URL ?? 'undefined',
            bucketName: process.env.MOM_STORAGE_BUCKET_NAME ?? 'undefined',
            accessKeyID: process.env.MOM_STORAGE_ACCESS_KEY_ID ?? 'undefined',
            secretAccessKey: process.env.MOM_STORAGE_SECRET_ACCESS_KEY ?? 'undefined'          
        },
        sentry: {
            dsn: process.env.SENTRY_DSN ?? 'undefined',
            debug: process.env.SENTRY_DEBUG === 'true'
        }
    },
    production: {
        root: rootPath,
        baseURL: process.env.BASE_URL ?? 'undefined',
        baseURL_API: process.env.API_URL ?? 'undefined',
        baseURL_Auth: process.env.AUTH_URL ?? 'undefined',
        baseURL_CDN: process.env.CDN_URL ?? 'undefined',
        domain: 'momentum-mod.org',
        port: +(process.env.NODE_PORT ?? 'undefined'),
        appID: 669270,
        accessToken: {
            secret: process.env.JWT_SECRET ?? 'undefined',
            expTime: '15m',
            gameExpTime: '24h',
            refreshExpTime: '5d',
            gameRefreshExpTime: '5d'
        },
        discord: {
            clientID: process.env.DISCORD_CLIENT_ID ?? 'undefined',
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? 'undefined'
        },
        twitch: {
            clientID: process.env.TWITCH_CLIENT_ID ?? 'undefined',
            clientSecret: process.env.TWITCH_CLIENT_SECRET ?? 'undefined'
        },
        twitter: {
            consumerKey: process.env.TWITTER_CONSUMER_KEY ?? 'undefined',
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET ?? 'undefined'
        },
        steam: {
            webAPIKey: process.env.STEAM_WEB_API_KEY ?? 'undefined',
            preventLimited: process.env.STEAM_PREVENT_LIMITED === 'true',
            useEncryptedTickets: process.env.STEAM_USE_ENCRYPTED_TICKETS === 'true',
            useSteamTicketLibrary: process.env.STEAM_USE_ENCRYPTED_TICKETS === 'true',
            ticketsSecretKey: process.env.STEAM_TICKETS_SECRET
        },
        db: {
            name: 'momentum',
            userName: process.env.MOM_DATABASE_USER ?? 'undefined',
            password: process.env.MOM_DATABASE_PW ?? 'undefined',
            host: 'db',
            logging: false,
            pool: {
                max: 10,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        },
        session: {
            secret: process.env.EXPRESS_SESSION_SECRET ?? 'undefined'
        },
        storage: {
            region: process.env.MOM_STORAGE_REGION ?? 'undefined',
            endpointURL: process.env.MOM_STORAGE_ENDPOINT_URL ?? 'undefined',
            bucketName: process.env.MOM_STORAGE_BUCKET_NAME ?? 'undefined',
            accessKeyID: process.env.MOM_STORAGE_ACCESS_KEY_ID ?? 'undefined',
            secretAccessKey: process.env.MOM_STORAGE_SECRET_ACCESS_KEY ?? 'undefined'
        },
        sentry: {
            dsn: process.env.SENTRY_DSN ?? 'undefined',
            debug: process.env.SENTRY_DEBUG === 'true'
        }
    }
};

export interface IAllConfigs {
    test: IConfig;
    development: IConfig;
    production: IConfig;
}

export interface IConfig {
    root: string;
    baseURL: string;
    baseURL_API: string;
    baseURL_Auth: string;
    baseURL_CDN: string;
    domain: string;
    port: number;
    appID: number;
    accessToken: {
        secret: string;
        expTime: string;
        gameExpTime: string;
        refreshExpTime: string;
        gameRefreshExpTime: string;
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
        useEncryptedTickets: boolean;
        ticketsSecretKey: string;
    };
    db: {
        name: string;
        userName: string;
        password: string;
        host: string;
        logging: any;
        pool: {
            max: number;
            min: number;
            acquire: number;
            idle: number;
        };
    };
    session: {
        secret: string;
    };
    storage: {
        region: string;
        endpointURL: string;
        bucketName: string;
        accessKeyID: string;
        secretAccessKey: string;
    };
    sentry: {
        dsn: string;
        debug: boolean;
    };
}

export const appConfig: IConfig = configs[env];
