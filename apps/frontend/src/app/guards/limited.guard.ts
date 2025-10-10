import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalUserService } from '../services/data/local-user.service';
import { Role } from '@momentum/constants';

export const LimitedGuard: CanActivateFn = () => {
  const userService = inject(LocalUserService);
  const router = inject(Router);

  if (userService.isLoggedIn && !userService.hasRole(Role.LIMITED)) {
    return true;
  } else {
    alert('You are not authorized to view this.');
    return router.parseUrl('/');
  }
};
