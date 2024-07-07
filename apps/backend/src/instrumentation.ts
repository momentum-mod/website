/* eslint @typescript-eslint/naming-convention: 0 */
import * as Sentry from '@sentry/node';
import {
  NodeOptions,
  nestIntegration,
  prismaIntegration,
  spanToJSON,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN
} from '@sentry/node';
import { Integration } from '@sentry/types';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { pino } from 'pino';
import { SentryInterceptor } from './app/interceptors/sentry.interceptor';
import { Environment } from './app/config';

// Sentry now has a dedicated Nest in integration but doesn't let us integrate
// nicely with our exception filter, also it's in an alpha state.
// Mostly following their approach from
// https://github.com/getsentry/sentry-javascript/blob/develop/packages/node/src/integrations/tracing/nest.ts

const dsn = process.env['SENTRY_DSN'];
const enableTracing = process.env['SENTRY_ENABLE_TRACING'] === 'true';
const sampleRate = +process.env['SENTRY_TRACE_SAMPLE_RATE'];

const integrations: Integration[] = [nestIntegration()];

const logger = pino();

if (process.env['SENTRY_TRACE_PRISMA'] === 'true') {
  integrations.push(prismaIntegration());
}

//https://docs.sentry.io/platforms/javascript/guides/node/profiling/#runtime-flags
if (process.env['SENTRY_ENABLE_NODE_PROFILING'] === 'true') {
  integrations.push(nodeProfilingIntegration());
}

const opts: NodeOptions = {
  dsn,
  environment: process.env['SENTRY_ENV'],
  enableTracing,
  tracesSampleRate: sampleRate,
  profilesSampleRate: sampleRate,
  debug: false,
  integrations
};

if (process.env['NODE_ENV'] === Environment.PRODUCTION && dsn) {
  logger.info('Initializing Sentry');
  Sentry.init(opts);
}

export function setupNestInterceptor() {
  if (!Sentry.isInitialized() || !process.env['SENTRY_DSN']) return;

  const client = Sentry.getClient();
  if (!client) return;

  client.on('spanStart', (span) => {
    const attributes = spanToJSON(span).data || {};

    // this is one of: app_creation, request_context, handler
    const type = attributes['nestjs.type'];

    // If this is already set, or we have no nest.js span, no need to process again...
    if (attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP] || !type) {
      return;
    }

    span.setAttributes({
      [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.otel.nestjs',
      [SEMANTIC_ATTRIBUTE_SENTRY_OP]: `${type}.nestjs`
    });
  });

  return new SentryInterceptor();
}
