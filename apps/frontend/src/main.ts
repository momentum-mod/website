import { provideAnimations } from '@angular/platform-browser/animations';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient
} from '@angular/common/http';
import { APP_BASE_HREF, IMAGE_CONFIG } from '@angular/common';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { SharedModule } from './app/shared.module';
import { APP_ROUTES } from './app/app.routes';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(SharedModule, BrowserModule),
    { provide: APP_BASE_HREF, useValue: '/' },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: IMAGE_CONFIG,
      // Map submission image handling inevitably requires resizing very large
      // images. Most users will never use this, but it's annoying for
      // developers working on this, and is the only place we're likely to
      // encounter this.
      useValue: { disableImageSizeWarning: true }
    },

    provideRouter(APP_ROUTES),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    // These PrimeNg services don't have `providedIn: root` so need providing
    // global here.
    MessageService,
    DialogService,
    ConfirmationService
  ]
}).catch((error) => console.error(error));
