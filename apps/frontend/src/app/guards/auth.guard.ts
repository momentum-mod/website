import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { LocalUserService } from '@momentum/frontend/data';
import { env } from '@momentum/frontend/env';

// TODO: CanActivate is deprecated in Angular 14 and now uses "functional
// guards" (I don't really understand how that simplifies anything - for this
// guard we'll still have to do a bunch of DI stuff using e.g. `inject(Router)`)
// Lets switch to that when refactoring auth to make more routes public.
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userService: LocalUserService,
    private readonly router: Router
  ) {}

  private readonly postAuthRedirectKey = 'postAuthLocation';

  canActivate(route: ActivatedRouteSnapshot) {
    // Previously we handled this redirection by passing this as a param to the
    // backend, then having that redirect. However this is actually really
    // annoying to do with an OAuth workflow (in short, you need a kind of
    // session store for each user undergoing login, in the backend). It's much
    // easier to just use a local session store like this.
    const redirect = sessionStorage.getItem(this.postAuthRedirectKey);
    if (redirect) {
      sessionStorage.removeItem(this.postAuthRedirectKey);
      return this.router.parseUrl('/' + redirect);
    }

    let hasPermission = true;
    if (route.data && route.data['onlyAllow']) {
      hasPermission = this.checkPermissions(route.data['onlyAllow']);
    }
    if (hasPermission && this.userService.isLoggedIn()) {
      return true;
    }

    if (window.location.pathname !== '/')
      sessionStorage.setItem(
        this.postAuthRedirectKey,
        window.location.pathname
      );
    window.location.href = env.auth + '/steam';
    return false;
  }

  checkPermissions(roles): boolean {
    let hasPermission = false;
    for (const role of roles) {
      if (this.userService.hasRole(role)) {
        hasPermission = true;
      }
    }
    return hasPermission;
  }
}
