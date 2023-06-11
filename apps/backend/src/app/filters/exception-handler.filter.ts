import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  HttpException,
  Inject
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '../modules/sentry/sentry.service';
import { SENTRY_INIT_STATE } from '../modules/sentry/sentry.const';
import { SentryInitState } from '../modules/sentry/sentry.interface';
import { Environment } from '@momentum/backend/config';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    private readonly sentryService: SentryService,
    @Inject(SENTRY_INIT_STATE) private readonly sentryEnabled: SentryInitState
  ) {}

  private readonly logger = new Logger('Exception Filter');

  catch(exception: Error, host: ArgumentsHost): void {
    try {
      const { httpAdapter } = this.httpAdapterHost;
      const context = host.switchToHttp();
      const path = httpAdapter.getRequestUrl(context.getRequest());
      const env = this.configService.get('env');

      let status, responseBody, eventID;

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

      // In production, send to Sentry so long as it's enabled (if the DSN is
      // invalid/empty it'll be disabled).
      if (env === Environment.PRODUCTION) {
        if (this.sentryEnabled) {
          eventID = this.sentryService.sendError(exception);

          this.log(exception, path, false, eventID);
        } else {
          this.log(exception, path);
        }
      }
      // We're in development, print actual errors (non-HttpException and 500s)
      // as errors and the rest as debug
      else this.log(exception, path, status && status >= 500);

      // Add timestamp, path
      responseBody.timestamp = new Date().toISOString();
      responseBody.path = path;
      if (eventID) responseBody.errorCode = eventID;

      httpAdapter.reply(context.getResponse(), responseBody, status);
    } catch (error) {
      console.error(
        'Exception filter errored, not throwing to avoid infinite loop!\n',
        error
      );
    }
  }

  private log(
    exception: Error,
    path: string,
    debug?: boolean,
    eventID?: string
  ) {
    // Look, I like pretty formatting, ok??
    const indent = Math.max(eventID ? 8 : 0, exception.stack ? 5 : 0, 4) + 2;
    let str = `\n  ${exception.name ?? 'Error'}\n  Path:${' '.repeat(
      indent - 4
    )}${path}\n`;
    if (eventID) str += `  Event ID:${' '.repeat(indent - 8)}${eventID}\n`;
    if (exception.stack)
      str += `  Stack:${' '.repeat(indent - 5)}${exception.stack}\n`;

    !debug ?? true ? this.logger.debug(str) : this.logger.error(str);
  }
}
