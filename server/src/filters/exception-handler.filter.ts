import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger, HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../../config/config.interface';
import { SentryExceptionService } from '../modules/sentry/sentry-exception/sentry-exception.service';

@Catch()
export class ExceptionHandlerFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly configService: ConfigService,
        private readonly sentryService: SentryExceptionService
    ) {}

    private readonly logger = new Logger('Exception Filter');

    catch(exception: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const context = host.switchToHttp();

        let status, responseBody;

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

        const eventID: number | null = exception.sentryEventID;
        const env = this.configService.get('env');

        // If Sentry is in performance tracking mode, SentryInterceptor will already have intercepted the request,
        // sent the error to Sentry, and appended an event ID to the error, we just need to log it locally and
        // return to the client.
        if (eventID) {
            this.logger.error(
                `${exception.name ?? 'Error'}\n` + `Sentry Event ID: ${eventID}\n` + `Stack: ${exception.stack}`
            );
        }
        // If interceptor mode is off but we're in production, we call the Sentry exception service from here.
        else if (env === Environment.Production) {
            const newEventID = this.sentryService.sendError(exception);

            this.logger.error(
                `${exception.name ?? 'Error'}\n` + `Sentry Event ID: ${newEventID}\n` + `Stack: ${exception.stack}`
            );
        }
        // If we're in development, just print as debug, this is often very useful when writing tests
        // Tests ran through CI shouldn't log <500s though
        else if (env === Environment.Development || (env === Environment.Test && status && status >= 500)) {
            this.logger.debug(`${exception.name ?? 'Error'}\n` + `Stack: ${exception.stack}`);
        }

        responseBody.timestamp = new Date().toISOString();
        responseBody.path = httpAdapter.getRequestUrl(context.getRequest());

        if (eventID) responseBody.errorCode = eventID;

        httpAdapter.reply(context.getResponse(), responseBody, status);
    }
}
