import {APP_BASE_HREF} from '@angular/common';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NgModule} from '@angular/core';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {CoreModule} from './@core/core.module';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {ThemeModule} from './@theme/theme.module';
import {MainPageModule} from './pages/main/main-page.module';
import {NotFoundModule} from './pages/not-found/not-found.module';
import {JwtModule} from '@auth0/angular-jwt';
import {OutgoingModule} from './pages/outgoing/outgoing.module';
import {MarkdownModule, MarkedOptions} from 'ngx-markdown';
import {NbDatepickerModule, NbDialogModule, NbGlobalPhysicalPosition, NbToastrModule} from '@nebular/theme';
import {RefreshTokenInterceptorService} from './@core/utils/refresh-token-interceptor.service';
import {NbEvaIconsModule} from '@nebular/eva-icons';
import {TimeagoModule} from 'ngx-timeago';

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
    NbEvaIconsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        whitelistedDomains: [
          'localhost:3002',
          'localhost:4200',
          '141.210.25.113',
        ],
        throwNoTokenError: false,
      },
    }),
    MarkdownModule.forRoot({
      markedOptions: {
        provide: MarkedOptions,
        useValue: {
          gfm: true,
          breaks: true,
          tables: false,
          smartLists: true,
          smartypants: false,
          sanitize: true,
          baseUrl: 'https://',
        },
      },
    }),
    NbDatepickerModule.forRoot(),
    NbToastrModule.forRoot({
      duration: 3000,
      destroyByClick: true,
      preventDuplicates: false,
      position: NbGlobalPhysicalPosition.TOP_RIGHT,
    }),
    NbDialogModule.forRoot({
      hasBackdrop: true,
      closeOnBackdropClick: true,
      closeOnEsc: true,
      autoFocus: true,
    }),

    TimeagoModule.forRoot(),
    ThemeModule.forRoot(),
    CoreModule.forRoot(),
  ],
  bootstrap: [AppComponent],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    { provide: HTTP_INTERCEPTORS, useClass: RefreshTokenInterceptorService, multi: true },
  ],
})
export class AppModule {
}
