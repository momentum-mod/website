import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmDeactivate {
  /**
   * Function that returns `true` if the deactivation show go ahead, otherwise
   * a string, which will be used as a message in a confirmation dialog.
   *
   * Note that this only affects Angular routes. To protect browser URL
   * navigation, page reloads, etc., use a `window:beforeunload` HostListener.
   */
  canDeactivate: () => true | string;
}

export const DeactivateConfirmGuard: CanDeactivateFn<
  ConfirmDeactivate
> = async (component: ConfirmDeactivate): Promise<boolean> => {
  const canDeactivate = component.canDeactivate();
  if (canDeactivate === true) {
    return true;
  }

  return new Promise((resolve) =>
    inject(ConfirmationService).confirm({
      message: canDeactivate,
      accept: () => resolve(true),
      reject: () => resolve(false)
    })
  );
};
