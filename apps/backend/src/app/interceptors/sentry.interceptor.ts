import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { getIsolationScope } from '@sentry/node';
import { getDefaultIsolationScope } from '@sentry/core';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (getIsolationScope() === getDefaultIsolationScope()) {
      Logger.warn(
        'Isolation scope is still the default isolation scope, skipping setting transactionName.'
      );
      return next.handle();
    }

    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    if (req.route) {
      getIsolationScope().setTransactionName(
        `${req.method?.toUpperCase() ?? 'UNKNOWN'} ${req.route.path}`
      );
    }

    return next.handle();
  }
}
