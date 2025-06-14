import { Injectable, inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { JWTResponseWeb } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private cookieService = inject(CookieService);
  private http = inject(HttpService);
  private router = inject(Router);

  constructor() {
    this.moveCookieToLocalStorage('accessToken');
    this.moveCookieToLocalStorage('refreshToken');
  }

  public logout(): void {
    this.http.post('revoke', { type: 'auth' }).subscribe();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // Redirects to maps browser page, since it's the main page used by unauthorized user
    this.router.navigateByUrl('/maps');
  }

  public isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    return Boolean(accessToken);
  }

  private moveCookieToLocalStorage(cookieName: string): void {
    if (!this.cookieService.check(cookieName)) return;

    const cookieValue = this.cookieService.get(cookieName);
    localStorage.setItem(cookieName, cookieValue);
    this.cookieService.delete(cookieName, '/');
  }

  public refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('Missing refresh token');
    return this.http
      .post<JWTResponseWeb>('refresh', {
        type: 'auth',
        body: { refreshToken }
      })
      .pipe(
        map((res) => {
          if (!res.accessToken || !res.refreshToken)
            throw new Error('Missing tokens');
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
          return res.accessToken;
        })
      );
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }
}
