import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

@Catch()
export class PrismaClientExceptionFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(e: any, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const errorCode = PrismaClientExceptionFilter.GenerateErrorCode();

        const responseBody = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            // Don't send database-related errors
            message: e instanceof PrismaClientKnownRequestError ? e.message : 'Database Error',
            errorCode: errorCode
        };

        Logger.error(
            `Error - Code [${errorCode}]\n` +
                `Exception Code: ${e.code}\n` +
                `Message: ${e.message}\n` +
                `Stack: ${e.stack}`
        );

        httpAdapter.reply(ctx.getResponse(), responseBody, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static GenerateErrorCode(): string {
        return Math.random().toString(36).toString().slice(2).toUpperCase();
    }
}
