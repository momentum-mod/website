import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {LocalUserService} from '../data/local-user.service';
import {ToasterService} from 'angular2-toaster';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(private userService: LocalUserService,
              private toastService: ToasterService) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    let hasPermission = true;
    if (route.data && route.data.onlyAllow) {
      hasPermission = this.checkPermissions(route.data.onlyAllow);
    }
    if (this.userService.isLoggedIn() && hasPermission)
      return true;
    else {
      this.toastService.popAsync('error', 'Not authorized', 'You are not authorized to view this.');
      return false;
    }
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
