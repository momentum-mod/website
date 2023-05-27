import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { LocalUserService } from '@momentum/frontend/data';
import { NbToastrService } from '@nebular/theme';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private userService: LocalUserService,
    private toastService: NbToastrService
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    let hasPermission = true;
    if (route.data && route.data['onlyAllow']) {
      hasPermission = this.checkPermissions(route.data['onlyAllow']);
    }
    if (this.userService.isLoggedIn() && hasPermission) return true;
    else {
      this.toastService.danger(
        'You are not authorized to view this.',
        'Not Authorized'
      );
      return false;
    }
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
