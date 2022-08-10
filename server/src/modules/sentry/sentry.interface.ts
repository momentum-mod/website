import { ModuleMetadata } from '@nestjs/common';
import { NodeOptions } from '@sentry/node';
import { Environment } from '../../../config/config.interface';

export interface SentryModuleOptions {
    environment: Environment;
    perfTracking: boolean;
    sentryOpts: Pick<NodeOptions, 'dsn' | 'debug' | 'tracesSampleRate'>;
}

export interface SentryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: any[];
    useFactory?: (...args: any[]) => Promise<NodeOptions>;
}

export interface SentryInitState {
    enabled: boolean;
    perfTracking: boolean;
}
