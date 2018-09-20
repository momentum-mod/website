import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { CookieService } from 'ngx-cookie-service';
import { JwtModule } from '@auth0/angular-jwt';

import { AppComponent } from './app.component';

import { AuthService } from './services/auth/auth.service';
import { UserService } from './services/user/user.service';

export function tokenGetter() {
	return localStorage.getItem('accessToken');
}

@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		JwtModule.forRoot({
			config: {
				tokenGetter: tokenGetter,
				whitelistedDomains: ['localhost:4200']//,
				//blacklistedRoutes: ['localhost:4200']
			}
		})
	],
	providers: [
		AuthService,
		CookieService,
		UserService
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
