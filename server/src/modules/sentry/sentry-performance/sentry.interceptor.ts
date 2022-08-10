import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, Scope } from '@nestjs/common';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import * as Sentry from '@sentry/node';
import { SentryPerformanceService } from './sentry-performance.service';

/**
 * Interceptor-based approach to Sentry that injects into each request.
 * Creates a span for monitoring performance of the request throughout its lifetime,
 * and finally, catches any errors and passes to Sentry.
 */
@Injectable({ scope: Scope.REQUEST })
export class SentryInterceptor implements NestInterceptor {
    constructor(private sentryService: SentryPerformanceService) {
        console.log('wpwwwwww');
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // Start a child span for performance tracing
        const span = this.sentryService.startChild({ op: `route handler` });
        console.log('intercepted a request!!!');

        return next.handle().pipe(
            catchError((error) => {
                const status = error.getStatus?.();
                // Don't log anything HttpException based that's in client error range
                if (!(error instanceof HttpException && status && status < 500)) {
                    // Capture the exception and send to Sentry, then add the error code to the error object
                    // so the exception filter can put it in the response later
                    error.sentryEventID = Sentry.captureException(error, this.sentryService.span.getTraceContext());
                }

                // Rethrow the error, exception filter will catch it later
                return throwError(() => error);
            }),
            finalize(() => {
                // TODO: are these spans really separate objects? debug it
                span.finish();
                this.sentryService.span.finish();
            })
        );
    }
}
