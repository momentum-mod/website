import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { SentryExceptionService } from '../sentry/sentry-exception/sentry-exception.service';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly sentryService: SentryExceptionService
    ) {}

    catch(e: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const context = host.switchToHttp();

        let sentryErrorCode;
        const statusCode = e instanceof HttpException ? e.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const response = {
            statusCode: statusCode,
            // Don't send the specifics of any database-related error
            message: e instanceof PrismaClientKnownRequestError ? 'Database Error' : e.message
        };

        // We don't care about logging 400s
        if (!(statusCode && statusCode >= 400 && statusCode < 500)) {
            sentryErrorCode = this.sentryService.sendError(e);
            Logger.error(
                `${e.name ?? 'Error'}\n` +
                    `Sentry Code: ${sentryErrorCode}\n` + // TODO: These seem to all just be DEV-ERROR, can we get the Sentry service to give us something unique?
                    `Message: ${e.message}\n` +
                    `Stack: ${e.stack}`
            );
        }

        if (sentryErrorCode) response['errorCode'] = sentryErrorCode;

        httpAdapter.reply(context.getResponse(), response, statusCode);
    }
}
