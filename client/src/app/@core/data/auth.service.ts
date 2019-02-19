import {Injectable} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import {JwtHelperService} from '@auth0/angular-jwt';
import {AccessTokenPayload} from '../models/access-token-payload';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import 'rxjs-compat/add/operator/switchMap';
import 'rxjs-compat/add/observable/throw';
import {Router} from '@angular/router';
import {finalize, map, share} from 'rxjs/operators';

export interface TokenRefreshResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(private cookieService: CookieService,
              private http: HttpClient,
              private router: Router) {
    this.moveCookieToLocalStorage('accessToken');
    this.moveCookieToLocalStorage('refreshToken');
  }

  public logout(): void {
    this.http.post('/auth/revoke', {}).pipe(
      finalize(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.router.navigateByUrl('/');
      }),
    ).subscribe();
  }

  public isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    return !!accessToken;
  }

  public getAccessTokenPayload(): AccessTokenPayload {
    const accessToken = this.getAccessToken();
    const jwtHelperService = new JwtHelperService();
    const decodedToken = jwtHelperService.decodeToken(accessToken);
    return decodedToken;
  }

  public removeSocialAuth(authType: string): Observable<any> {
    return this.http.delete('/api/user/profile/social/' + authType, {
      responseType: 'text',
    });
  }

  private moveCookieToLocalStorage(cookieName: string): void {
    const cookieExists = this.cookieService.check(cookieName);
    if (cookieExists) {
      const cookieValue = this.cookieService.get(cookieName);
      localStorage.setItem(cookieName, cookieValue);
      this.cookieService.delete(cookieName);
    }
  }

  public refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return of(null);
    }
    return this.http.post('/auth/refresh', { refreshToken: refreshToken }).pipe(
      share(),
      map((res: TokenRefreshResponse) => {
        const newAccessToken = res.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        return newAccessToken;
      }),
    );
  }

  public getAccessToken(): string {
    const accessToken = localStorage.getItem('accessToken');
    return accessToken;
  }

}
