import { Injectable, Logger, Scope } from '@nestjs/common';
import '@sentry/tracing'; // https://github.com/getsentry/sentry-javascript/issues/4731#issuecomment-1075410543
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryExceptionService {
    constructor(private readonly config: ConfigService) {
        console.log('wowzers');
    }

    sendError(error: any): string {
        if (!this.config.get('sentry.dsn')) {
            Logger.warn("Want to report an error to Sentry but our DSN isn't set!", 'Sentry');
            return;
        }

        const transaction = Sentry.startTransaction({
            op: 'API Error',
            name: error
        });

        Sentry.getCurrentHub().configureScope((scope) => {
            scope.setSpan(transaction);

            scope.setContext(`API Error`, null);
        });

        const result: string = Sentry.captureException(error);

        transaction.finish();

        return result;
    }
}
