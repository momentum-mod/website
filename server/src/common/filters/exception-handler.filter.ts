import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { SentryExceptionService } from '../../modules/sentry/sentry-exception/sentry-exception.service';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly sentryService: SentryExceptionService
    ) {}

    private readonly logger = new Logger('Exception Filter');

    catch(exception: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const context = host.switchToHttp();

        let sentryErrorCode, status, responseBody;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            responseBody = typeof res == 'string' ? { message: res } : res;
        }
        // If it's not a Nest HttpException just 500 and don't include any extra data
        else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            responseBody = {
                message: exception instanceof PrismaClientKnownRequestError ? 'Database Error' : 'Internal Server Error'
            };
        }

        // We don't care about logging 400s
        if (!status || status < 400 || status >= 500) {
            sentryErrorCode = this.sentryService.sendError(exception);
            this.logger.error(
                `${exception.name ?? 'Error'}\n` +
                    `Sentry Code: ${sentryErrorCode}\n` + // TODO: These seem to all just be DEV-ERROR, can we get the Sentry service to give us something unique?
                    `Stack: ${exception.stack}`
            );
        }

        responseBody.timestamp = new Date().toISOString();
        responseBody.path = httpAdapter.getRequestUrl(context.getRequest());
        if (sentryErrorCode) responseBody.errorCode = sentryErrorCode;

        httpAdapter.reply(context.getResponse(), responseBody, status);
    }
}
