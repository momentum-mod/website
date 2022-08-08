import { Injectable, Scope } from '@nestjs/common';
import '@sentry/tracing'; // https://github.com/getsentry/sentry-javascript/issues/4731#issuecomment-1075410543
import * as Sentry from '@sentry/node';
import { environment } from '../../../../config/config_old';

@Injectable({ scope: Scope.TRANSIENT })
export class SentryExceptionService {
    /**
     * Takes our error and logs it in sentry
     *
     * @param error
     * @returns Sentry Event ID for easy searching
     */
    sendError(error: any): string {
        if (environment !== 'production') {
            return 'DEV-ERROR';
        }

        const transaction = Sentry.startTransaction({
            op: 'API Error',
            name: error
        });

        // setup context of newly created transaction
        Sentry.getCurrentHub().configureScope((scope) => {
            scope.setSpan(transaction);

            // customize your context here
            scope.setContext(`API Error`, null);
        });

        const result: string = Sentry.captureException(error);
        transaction.finish();
        return result;
    }
}
