import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AccessTokenPayload } from '../models/access-token-payload';

@Injectable()
export class AuthService {
  /**
   * @param cookieService Starts OpenID Steam authentication by redirecting to Steam OpenID URL
   * @return Redirection to Steam OpenID URL will occur
   */
  constructor(private cookieService: CookieService) {
    const cookieExists = this.cookieService.check('accessToken');
    const jwtHelperService = new JwtHelperService();
    if (cookieExists) {
      const accessToken = this.cookieService.get('accessToken');
      localStorage.setItem('accessToken', accessToken);
      this.cookieService.delete('accessToken');
    }
    if (jwtHelperService.isTokenExpired(localStorage.getItem('accessToken'))) {
      localStorage.setItem('accessToken', '');
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
    const decodedToken = jwtHelperService.decodeToken(accessToken);
    return decodedToken;
  }

}
