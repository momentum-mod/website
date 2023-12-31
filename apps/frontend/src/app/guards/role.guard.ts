import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { LocalUserService } from '../services';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const userService: LocalUserService = inject(LocalUserService);
  const router = inject(Router);

  const allowedRoles = route?.data?.['roles'];
  if (!allowedRoles && !Array.isArray(allowedRoles))
    throw new Error('RoleGuard applied on route without `roles` arrays');

  // Passes iff user logged in and has one of the roles in data.roles.
  if (
    userService.isLoggedIn() &&
    allowedRoles.some((role) => userService.hasRole(role))
  ) {
    return true;
  } else {
    // Only way to reach this is entering URLs into browser, regular alert is
    // fine
    alert('You are not authorized to view this.');
    // Return UrlTree, which fails guard and redirects.
    return router.parseUrl('/');
  }
};
