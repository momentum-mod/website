import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { LocalUserService } from '../services/data/local-user.service';

export const AuthGuard: CanActivateFn = () => {
  const userService = inject(LocalUserService);

  // This guard passes if the client is logged in (essentially, if they
  // have an access token in local storage).
  if (userService.isLoggedIn) {
    return true;
  }

  userService.login();
  return false;
};
