import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { map, share } from 'rxjs/operators';
import { HttpService } from './http.service';

export interface TokenRefreshResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private cookieService: CookieService,
    private http: HttpService,
    private router: Router
  ) {
    this.moveCookieToLocalStorage('accessToken');
    this.moveCookieToLocalStorage('refreshToken');
  }

  public logout(): void {
    this.http.post('revoke', { type: 'auth' }).subscribe();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.router.navigateByUrl('/');
  }

  public isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    return !!accessToken;
  }

  public getAccessTokenPayload(): any /* TODO: was AccessTokenPayload */ {
    const accessToken = this.getAccessToken();
    const jwtHelperService = new JwtHelperService();
    return jwtHelperService.decodeToken(accessToken);
  }

  private moveCookieToLocalStorage(cookieName: string): void {
    if (!this.cookieService.check(cookieName)) return;

    const cookieValue = this.cookieService.get(cookieName);
    localStorage.setItem(cookieName, cookieValue);
    this.cookieService.delete(cookieName, '/');
  }

  public refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return of('null');
    }
    return this.http
      .post('refresh', { type: 'auth', body: { refreshToken } })
      .pipe(
        share(),
        map((res) => {
          const newAccessToken = (res as TokenRefreshResponse)?.accessToken;
          if (!newAccessToken) return 'null';
          localStorage.setItem('accessToken', newAccessToken);
          return newAccessToken;
        })
      );
  }

  public getAccessToken(): string {
    return localStorage.getItem('accessToken') ?? '';
  }
}
