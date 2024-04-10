import { ModuleMetadata } from '@nestjs/common';
import { NodeOptions } from '@sentry/node';
import { Environment } from '../../config';

export interface SentryModuleOptions {
  environment: Environment;
  enableTracing: boolean;
  sentryOpts: NodeOptions;
}

export interface SentryModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory?: (...args: any[]) => Promise<SentryModuleOptions>;
}

export type SentryInitState = boolean;
