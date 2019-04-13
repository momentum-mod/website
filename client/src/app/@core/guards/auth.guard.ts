import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {LocalUserService} from '../data/local-user.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private userService: LocalUserService) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    let hasPermission = true;
    if (route.data && route.data.onlyAllow) {
      hasPermission = this.checkPermissions(route.data.onlyAllow);
    }
    if (hasPermission && this.userService.isLoggedIn()) {
      return true;
    }
    window.location.href = '/auth/steam';
  }

  checkPermissions(roles): boolean {
    let hasPermission = false;
    roles.forEach(role => {
      if (this.userService.hasRole(role)) {
        hasPermission = true;
      }
    });
    return hasPermission;
  }

}
