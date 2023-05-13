import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { LocalUserService } from '../data/local-user.service';
import { env } from '@momentum/frontend/env';

// TODO: CanActivate is deprecated, don't understand ng routing properly yet
// Come back in future
// noinspection JSDeprecatedSymbols
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private userService: LocalUserService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    return true;
    let hasPermission = true;
    if (route.data && route.data['onlyAllow']) {
      hasPermission = this.checkPermissions(route.data['onlyAllow']);
    }
    if (hasPermission && this.userService.isLoggedIn()) {
      return true;
    }
    if (window.location.pathname !== '/')
      window.location.href = env.auth + '/auth/steam?r=' + window.location.href;
    else window.location.href = env.auth + '/auth/steam';
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
