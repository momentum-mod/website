import { ModuleMetadata } from '@nestjs/common';
import { Environment } from '../../../config/config.interface';
import { NodeOptions } from '@sentry/node';

export interface SentryModuleOptions {
    environment: Environment;
    sentryOpts: Pick<NodeOptions, 'dsn' | 'debug' | 'tracesSampleRate'>;
}

export interface SentryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: any[];
    useFactory?: (...args: any[]) => Promise<NodeOptions>;
}

export type SentryInitState = boolean;
