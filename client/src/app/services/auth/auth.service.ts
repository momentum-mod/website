import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { JwtModule, JwtHelperService } from '@auth0/angular-jwt';

interface AccessTokenPayload {
	id: number;
	displayName: string;
	avatar: string;
	permissions: number;
}

@Injectable()
export class AuthService {

	constructor(private cookieService: CookieService, private jwtModule: JwtModule, private jwtHelperService: JwtHelperService) {
		const cookieExists = this.cookieService.check('accessToken');
		if (cookieExists) {
			const accessToken = this.cookieService.get('accessToken');
			localStorage.setItem('accessToken', accessToken);
			this.cookieService.delete('accessToken');
		}
	}

	public logout(): void {
		localStorage.setItem('accessToken', '');
	}

	public isLoggedIn(): boolean {
		const accessToken = localStorage.getItem('accessToken');
		if (accessToken === null) {
			return false;
		}
		const isTokenExpired = this.jwtHelperService.isTokenExpired(accessToken);
		return !isTokenExpired;
	}

	public getAccessTokenPayload(): AccessTokenPayload {
		const accessToken = localStorage.getItem('accessToken');
		if (accessToken === null) {
			return null;
		}
		const payload = this.jwtHelperService.decodeToken(accessToken);
		return payload;
	}

}
