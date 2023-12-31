import { provideAnimations } from '@angular/platform-browser/animations';
import { bootstrapApplication, BrowserModule } from '@angular/platform-browser';
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient
} from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { MessageService } from 'primeng/api';
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
    provideRouter(APP_ROUTES),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    // These PrimeNg services don't have `providedIn: root` so need providing
    // global here.
    MessageService,
    DialogService
  ]
}).catch((error) => console.error(error));
