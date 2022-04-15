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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(e: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const httpError = new CustomHTTPError(
            e instanceof HttpException ? (e as HttpException).getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
            // Don't send database-releted errors
            e instanceof PrismaClientKnownRequestError ? 'Database Error' : e.message
        );

        if (!(e instanceof UnauthorizedException)) {
            httpError.GenerateErrorCode();

            Logger.error(
                `Error - Code [${httpError.errorCode}]\n` +
                    `Exception Code: ${e.code}\n` +
                    `Message: ${e.message}\n` +
                    `Stack: ${e.stack}`
            );
        }

        httpAdapter.reply(ctx.getResponse(), httpError, httpError.statusCode);
    }
}

class CustomHTTPError {
    statusCode: number;
    message: string;
    errorCode: string;

    constructor(_statusCode: number, _message: string) {
        this.statusCode = _statusCode;
        this.message = _message;
    }

    GenerateErrorCode() {
        this.errorCode = Math.random().toString(36).toString().slice(2).toUpperCase();
    }
}
