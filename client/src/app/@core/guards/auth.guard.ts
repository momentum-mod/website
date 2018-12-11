import { Injectable } from '@angular/core';
import {CanActivate, ActivatedRouteSnapshot, Router} from '@angular/router';
import { LocalUserService } from '../data/local-user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private userService: LocalUserService,
              private router: Router) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    let hasPermission = true;
    if (route.data && route.data.onlyAllow) {
      hasPermission = this.checkPermissions(route.data.onlyAllow);
    }
    if (hasPermission && this.userService.isLoggedIn()) {
      return true;
    }
    this.router.navigate(['/auth/steam']);
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
