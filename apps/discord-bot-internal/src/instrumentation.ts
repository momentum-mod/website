import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { logger } from './logger';

const dsn = process.env['SENTRY_DSN'];
const enableTracing = process.env['SENTRY_ENABLE_TRACING'] === 'true';
const sampleRate = enableTracing
  ? Number(process.env['SENTRY_TRACE_SAMPLE_RATE'])
  : 0;

const integrations = [Sentry.pinoIntegration()];

if (process.env['SENTRY_ENABLE_NODE_PROFILING'] === 'true') {
  integrations.push(nodeProfilingIntegration());
}

if (process.env.NODE_ENV === 'prod' && dsn) {
  logger.info('Initializing Sentry');
  Sentry.init({
    dsn,
    tracesSampleRate: sampleRate,
    profilesSampleRate: sampleRate,
    normalizeDepth: 6,
    integrations,
    enableLogs: true
  });
}
