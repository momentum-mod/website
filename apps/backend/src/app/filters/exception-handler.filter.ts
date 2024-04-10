import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import '@sentry/tracing'; // Required according to https://github.com/getsentry/sentry-javascript/issues/4731#issuecomment-1075410543
import * as Sentry from '@sentry/node';
import { SENTRY_INIT_STATE } from '../modules/sentry/sentry.const';
import { SentryInitState } from '../modules/sentry/sentry.interface';
import { Environment } from '../config';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    @Inject(SENTRY_INIT_STATE) private readonly sentryEnabled: SentryInitState
  ) {}

  private readonly logger = new Logger('Exception Filter');

  catch(exception: Error, host: ArgumentsHost): void {
    try {
      const { httpAdapter } = this.httpAdapterHost;
      const context = host.switchToHttp();
      const path = httpAdapter.getRequestUrl(context.getRequest());
      const env = this.configService.get('env');

      let status: number, responseBody: Record<string, any>, eventID: string;

      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const res = exception.getResponse();
        responseBody = typeof res == 'string' ? { message: res } : res;
      }
      // If it's not a Nest HttpException just 500 and don't include any extra data
      else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        responseBody = {
          message:
            exception instanceof PrismaClientKnownRequestError
              ? 'Database Error'
              : 'Internal Server Error'
        };
      }

      const isProd = env === Environment.PRODUCTION;
      const isActualError = !status || status >= 500;
      if (isProd) {
        // Don't do anything for 4xxs in prod, they're not actual errors and
        // they'll get logged by pino-http like any other response.
        if (isActualError) {
          // Dupe code, but don't want to make a pointless object for 4xxs in prod (very common)
          const msg: any = {
            path,
            name: exception.name,
            message: exception.message
          };

          // In production, send to Sentry so long as it's enabled (if the DSN is
          // invalid/empty it'll be disabled).
          if (this.sentryEnabled) {
            eventID = Sentry.captureException(exception);
            msg.eventID = eventID;
          }

          this.logger.error(msg);
        }
      } else {
        const msg: any = {
          path,
          name: exception.name,
          message: exception.message,
          stack: exception.stack // Stack is useful in dev, waste in prod, Sentry has all that.
        };
        // We're in development, print actual errors (non-HttpException and 500s)
        // as errors and the rest as debug
        if (isActualError) {
          this.logger.error(msg);
        } else {
          this.logger.debug(msg);
        }
      }

      // Add timestamp, path to response body
      responseBody.timestamp = new Date().toISOString();
      responseBody.path = path;
      if (eventID) responseBody.errorCode = eventID;

      // Send it back
      httpAdapter.reply(context.getResponse(), responseBody, status);
    } catch (error) {
      this.logger.fatal({
        message:
          'Exception filter errored, not throwing to avoid infinite loop!\n',
        error
      });
    }
  }
}
