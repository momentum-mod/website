import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const POST_AUTH_REDIRECT_KEY = 'postAuthLocation';

export const RedirectGuard: CanActivateFn = () => {
  const router = inject(Router);

  // Check whether redirect URL exists in session storage. If this is the case,
  // we redirect to this path and remove it from storage (to prevent infinite loop)
  const redirect = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (redirect) {
    sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return router.parseUrl('/' + redirect);
  }

  return true;
};
