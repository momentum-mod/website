import * as Sentry from '@sentry/node';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Based on https://github.com/ericjeker/nestjs-sentry-example/blob/main/src/sentry/sentry.interceptor.ts,
    // but updated for Sentry 7, which majorly changed how transactions/spans are handled.
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: `${method} ${url}`
      },
      (rootSpan: Sentry.Span) =>
        Sentry.startSpan(
          {
            op: 'http.handler',
            name: `${context.getClass().name}.${context.getHandler().name}`
          },
          (span: Sentry.Span) =>
            next.handle().pipe(
              tap(() => {
                span.end();
                rootSpan.end();
              })
            )
        )
    );
  }
}
