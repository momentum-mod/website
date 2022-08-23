/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import * as Sentry from '@sentry/angular';
import { BrowserTracing } from '@sentry/tracing';

if (environment.production) {
  enableProdMode();
}

Sentry.init({
  dsn: environment.sentry.dsn,
  // In order to avoid all [Object object] in the output
  normalizeDepth: 20,
  environment: environment.sentry.env,
  integrations: [
    // Track browser url
    new BrowserTracing({
      tracingOrigins: ['localhost', environment.api, /^\//],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
  tracesSampleRate: 1.0,
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
