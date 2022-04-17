import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    Logger,
    UnauthorizedException,
    HttpException
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { SentryExceptionService } from '../sentry/sentry-exception/sentry-exception.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly sentryService: SentryExceptionService
    ) {}

    catch(e: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const httpError = new CustomHTTPError(
            e instanceof HttpException ? (e as HttpException).getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
            // Don't send database-releted errors
            e instanceof PrismaClientKnownRequestError ? 'Database Error' : e.message,
            e
        );

        if (!(e instanceof UnauthorizedException)) {
            httpError.errorCode = this.sentryService.sendError(e);

            Logger.error(httpError.toString());
        }

        httpAdapter.reply(ctx.getResponse(), httpError, httpError.statusCode);
    }
}

class CustomHTTPError {
    statusCode: number;
    message: string;
    errorCode: string;
    private _error: any;

    constructor(_statusCode: number, _message: string, _error: any) {
        this.statusCode = _statusCode;
        this.message = _message;
        this._error = _error;
    }

    public toString = (): string => {
        return (
            `Error - Code [${this.errorCode}]\n` +
            `Exception Code: ${this._error.code}\n` +
            `Message: ${this._error.message}\n` +
            `Stack: ${this._error.stack}`
        );
    };
}
