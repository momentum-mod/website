import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { AuthService } from '../data/auth.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

@Injectable()
export class RefreshTokenInterceptorService implements HttpInterceptor {
  private refreshInProgress: boolean;
  private refreshTokenSubject: BehaviorSubject<any>;

  constructor(private authService: AuthService) {
    this.refreshInProgress = false;
    this.refreshTokenSubject = new BehaviorSubject<any>(null);
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (error.status === 401) {
          if (req.url.includes('refresh')) {
            this.authService.logout();
            return throwError(error);
          } else if (this.refreshInProgress) {
            return this.refreshTokenSubject.pipe(
              filter((token) => token !== null),
              take(1),
              switchMap(() => next.handle(this.addAccessToken(req)))
            );
          } else {
            this.refreshInProgress = true;
            this.refreshTokenSubject.next(null);
            return this.authService.refreshAccessToken().pipe(
              switchMap((token: string) => {
                this.refreshInProgress = false;
                this.refreshTokenSubject.next(token);
                return next.handle(this.addAccessToken(req));
              })
            );
          }
        }
        return throwError(error);
      })
    );
  }

  private addAccessToken(req: HttpRequest<any>): HttpRequest<any> {
    const accessToken = this.authService.getAccessToken();
    if (accessToken) {
      return req.clone({
        setHeaders: {
          Authorization: 'Bearer ' + accessToken
        }
      });
    }
    return req;
  }
}
