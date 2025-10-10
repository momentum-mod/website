/* eslint @typescript-eslint/naming-convention: 0 */
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { pino } from 'pino';
import { Environment } from './app/config/config.interface';

const dsn = process.env['SENTRY_DSN'];
const enableTracing = process.env['SENTRY_ENABLE_TRACING'] === 'true';
const sampleRate = enableTracing
  ? Number(process.env['SENTRY_TRACE_SAMPLE_RATE'])
  : 0;

const integrations = [];

if (process.env['SENTRY_TRACE_PRISMA'] === 'true') {
  integrations.push(Sentry.prismaIntegration());
}

//https://docs.sentry.io/platforms/javascript/guides/node/profiling/#runtime-flags
if (process.env['SENTRY_ENABLE_NODE_PROFILING'] === 'true') {
  integrations.push(nodeProfilingIntegration());
}

const opts: Sentry.NodeOptions = {
  dsn,
  environment: process.env['SENTRY_ENV'],
  tracesSampleRate: 1,
  profilesSampleRate: 1,
  debug: false,
  normalizeDepth: 6,
  integrations,
  _experiments: { enableLogs: true },
  spotlight: true
};

if (process.env['NODE_ENV'] === Environment.PRODUCTION && dsn) {
  pino().info('Initializing Sentry');
  Sentry.init(opts);
} else {
  Sentry.init({ spotlight: true });
}
