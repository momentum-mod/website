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
  tracesSampleRate: sampleRate,
  profileSessionSampleRate: sampleRate,
  profileLifecycle: 'trace',
  debug: false,
  normalizeDepth: 10,
  integrations,
  // Sentry 11 collects all of these by default; keep the v10 behaviour (when
  // sendDefaultPii was unset) rather than start sending user/request data.
  // https://docs.sentry.io/platforms/javascript/guides/node/migration/v10-to-v11/
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] }
    },
    httpBodies: [],
    urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    graphQL: { document: false, variables: false }
  }
};

if (process.env['NODE_ENV'] === Environment.PRODUCTION && dsn) {
  pino().info('Initializing Sentry');
  Sentry.init(opts);
}
