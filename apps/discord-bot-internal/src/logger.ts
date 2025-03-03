import pino from 'pino';
const DEV = process.env.NODE_ENV === 'dev';
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  ...(DEV
    ? {
        transport: {
          target: 'pino-pretty'
        }
      }
    : {}),
  level: LOG_LEVEL
});
