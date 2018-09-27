import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { JwtHelperService } from '@auth0/angular-jwt';

interface AccessTokenPayload {
  id: number;
  displayName: string;
  avatar: string;
  permissions: number;
}

@Injectable()
export class AuthService {

  constructor(private cookieService: CookieService) {
    const cookieExists = this.cookieService.check('accessToken');
    if (cookieExists) {
      const accessToken = this.cookieService.get('accessToken');
      localStorage.setItem('accessToken', accessToken);
      this.cookieService.delete('accessToken');
    }
  }

  public logout(): void {
    localStorage.setItem('accessToken', '');
	window.location.href = '/';
  }

  public isAuthenticated(): boolean {
    const accessToken = localStorage.getItem('accessToken');
    const jwtHelperService = new JwtHelperService();
    if (!accessToken) {
      return false;
    }
    const isTokenExpired = jwtHelperService.isTokenExpired(accessToken);
    return !isTokenExpired;
  }

  public getAccessTokenPayload(): AccessTokenPayload {
    const accessToken = localStorage.getItem('accessToken');
    const jwtHelperService = new JwtHelperService();
    if (!accessToken) {
      return null;
    }
    const payload = jwtHelperService.decodeToken(accessToken);
    return payload;
  }

}
