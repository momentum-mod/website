import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { UserService } from '../data/user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private userService: UserService) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    let hasPermission = true;
    if (route.data && route.data.onlyAllow) {
      hasPermission = this.checkPermissions(route.data.onlyAllow);
    }
    if (hasPermission && this.userService.isLoggedIn()) {
      return true;
    }
    window.location.href = '/api/auth/steam';
  }

  checkPermissions(permissions): boolean {
    let hasPermission = false;
    permissions.forEach(permission => {
      if (this.userService.hasPermission(permission)) {
        hasPermission = true;
      }
    });
    return hasPermission;
  }

}
