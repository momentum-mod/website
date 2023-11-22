import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { HomeModule } from './app/pages/home/home.module';
import { AppRoutingModule } from './app/app-routing.module';
import { NotFoundModule } from './app/pages/not-found/not-found.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { SharedModule } from './app/shared.module';
import { AuthInterceptor } from './app/services/auth.interceptor';
import {
  HTTP_INTERCEPTORS,
  withInterceptorsFromDi,
  provideHttpClient
} from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      SharedModule,
      BrowserModule,
      NotFoundModule,
      AppRoutingModule,
      HomeModule
    ),
    { provide: APP_BASE_HREF, useValue: '/' },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch((error) => console.error(error));
