import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { Prisma } from '@momentum/db';
import { reportException } from './exception-handler.filter';

/**
 * The WebSocket counterpart of {@link ExceptionHandlerFilter}.
 *
 * Nest's default gateway filter reports errors with `client.emit('exception')`,
 * which on a raw `ws` socket is a local event rather than a message to the
 * client, so a failed handler would just never respond. Instead, reply to the
 * message's event with `{ error }`, which is the shape game clients already
 * expect for errors.
 */
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger('WS Exception Filter');

  catch(exception: Error, host: ArgumentsHost): void {
    try {
      const context = host.switchToWs();
      const client = context.getClient<WebSocket>();
      const event = context.getPattern();
      const env = this.configService.get('env');

      let status: number, error: string;

      if (exception instanceof HttpException) {
        status = exception.getStatus();
        error = getHttpExceptionMessage(exception);
      }
      // If it's not a Nest HttpException just 500 and don't include any extra data
      else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        error =
          exception instanceof Prisma.PrismaClientKnownRequestError
            ? 'Database Error'
            : 'Internal Server Error';
      }

      const eventID = reportException(
        exception,
        status,
        { event },
        env,
        this.logger
      );

      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event,
            data: { error, ...(eventID ? { errorCode: eventID } : {}) }
          })
        );
      }
    } catch (error) {
      this.logger.fatal({
        message:
          'Exception filter errored, not throwing to avoid infinite loop!\n',
        error
      });
    }
  }
}

/** Validation failures have a list of messages, others a single string. */
function getHttpExceptionMessage(exception: HttpException): string {
  const res = exception.getResponse();
  if (typeof res === 'string') return res;

  const message = (res as { message?: string | string[] }).message;
  return Array.isArray(message)
    ? message.join(', ')
    : (message ?? exception.message);
}
