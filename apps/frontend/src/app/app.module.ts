import { APP_BASE_HREF } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MainPageModule } from './pages/main/main-page.module';
import { NotFoundModule } from './pages/not-found/not-found.module';
import { JwtModule } from '@auth0/angular-jwt';
import { OutgoingModule } from './pages/outgoing/outgoing.module';
import { RefreshTokenInterceptorService } from './services/refresh-token-interceptor.service';
import { env } from '@momentum/frontend/env';

export function tokenGetter() {
  return localStorage.getItem('accessToken');
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MainPageModule,
    NotFoundModule,
    OutgoingModule,
    AppRoutingModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: [
          'localhost:3000',
          'localhost:4200',
          'momentum-mod.org',
          new URL(env.api).host,
          new URL(env.auth).host
        ],
        throwNoTokenError: false
      }
    })
  ],
  bootstrap: [AppComponent],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RefreshTokenInterceptorService,
      multi: true
    }
  ]
})
export class AppModule {}
