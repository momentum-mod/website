import { Request } from 'express';
import { Scope, Logger } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import '@sentry/tracing'; // https://github.com/getsentry/sentry-javascript/issues/4731#issuecomment-1075410543
import { Span, SpanContext } from '@sentry/types';

/**
 * Because we inject REQUEST we need to set the service as request scoped
 */
@Injectable({ scope: Scope.REQUEST })
export class SentryPerformanceService {
    /**
     * Return the current span defined in the current Hub and Scope
     */
    get span(): Span {
        return Sentry.getCurrentHub().getScope().getSpan();
    }

    /**
     * When injecting the service it will create the main transaction
     *
     * @param request
     */
    constructor(@Inject(REQUEST) private request: Request) {
        const { method, headers, url } = this.request;

        // recreate transaction based from HTTP request
        const transaction = Sentry.startTransaction({
            name: `Route: ${method} ${url}`,
            op: 'transaction'
        });

        // setup context of newly created transaction
        Sentry.getCurrentHub().configureScope((scope) => {
            scope.setSpan(transaction);

            // customize your context here
            scope.setContext('http', {
                method,
                url,
                headers
            });
        });

        transaction.finish();
    }

    /**
     * This will simply start a new child span in the current span
     *
     * @param spanContext
     */
    startChild(spanContext: SpanContext) {
        return this.span.startChild(spanContext);
    }
}
