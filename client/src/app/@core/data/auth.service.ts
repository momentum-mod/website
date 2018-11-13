import {Injectable} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import {JwtHelperService} from '@auth0/angular-jwt';
import {AccessTokenPayload} from '../models/access-token-payload';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import 'rxjs-compat/add/operator/switchMap';
import 'rxjs-compat/add/observable/throw';

@Injectable()
export class AuthService {
  constructor(private cookieService: CookieService,
              private http: HttpClient) {
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
    localStorage.setItem('user', '');
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

  public removeSocialAuth(authType: string): Observable<any> {
    return this.http.delete('/api/user/profile/social/' + authType, {
      responseType: 'text',
    });
  }

}
