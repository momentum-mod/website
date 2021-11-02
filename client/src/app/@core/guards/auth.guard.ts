import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {LocalUserService} from '../data/local-user.service';
import {environment} from '../../../environments/environment';

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
    if (window.location.pathname !== '/')
      window.location.href = environment.auth + '/auth/steam?r=' + window.location.href;
    else
      window.location.href = environment.auth + '/auth/steam';
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
