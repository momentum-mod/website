import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { HttpService } from './http.service';
import { JWTResponseWebDto } from '@momentum/backend/dto';

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
    // Redirects to frontpage for now, once we remove that from this project,
    // we've have to do an ugly `window.location.href` redirect, at least until
    // we have sections of the dashboard than can be used without a login.
    this.router.navigateByUrl('/');
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
      .post<JWTResponseWebDto>('refresh', {
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
