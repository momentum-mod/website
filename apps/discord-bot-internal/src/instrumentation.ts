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
    profileSessionSampleRate: sampleRate,
    profileLifecycle: 'trace',
    normalizeDepth: 6,
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
  });
}
