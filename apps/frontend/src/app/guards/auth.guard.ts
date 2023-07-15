import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalUserService } from '@momentum/frontend/data';
import { env } from '@momentum/frontend/env';

const POST_AUTH_REDIRECT_KEY = 'postAuthLocation';

export const AuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const userService = inject(LocalUserService);

  // Check whether redirect URL exists in session storage. If this is the case,
  // this is the second time this function has been called: the user failed auth
  // once, the URL was stored, then they were redirected back to the dashboard.
  // So, now we redirect remove the token (so no infinite loop), and redirect
  // back to their original requested URL on this site.
  const redirect = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (redirect) {
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return router.parseUrl('/' + redirect);
  }

  // This guard passes iff the client is logged in (essentially, if they
  // have an access token in local storage).
  if (userService.isLoggedIn()) {
    return true;
  }

  // They're not logged in, so store current path in session storage and send
  // them over to Steam
  if (window.location.pathname !== '/')
    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, window.location.pathname);

  window.location.href = env.auth + '/web';
  return false;
};
