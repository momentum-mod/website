import { Component, inject } from '@angular/core';
import { TOS_VERSION } from '@momentum/constants';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-tos-dialog',
  template: `
    <div>
      @if (config.data.isFirstTime) {
        <p>Welcome to Momentum Mod!</p>
        <p>
          If this is your first time signing in to our system, and you haven't
          launched the Steam game already, signing in will create a user account
          with our systems.
        </p>
        <p>
          By doing this, you confirm you agree to our Terms of Service, and
          understand our Privacy Policy.
        </p>
      } @else {
        <p>Our Terms of Service and Privacy Policy have been updated.</p>
        <p>
          Feel free to read the updated documents below. By clicking 'Accept'
          you are confirming you agree to the updated terms/privacy policy.
        </p>
      }
    </div>
    <div class="flex gap-2 pt-6">
      <a href="https://momentum-mod.org/legal/terms-of-service" target="_blank">
        <button type="button" class="btn btn-blue">Terms of Service</button>
      </a>
      <a href="https://momentum-mod.org/legal/privacy-policy" target="_blank">
        <button type="button" class="btn btn-blue">Privacy Policy</button>
      </a>

      <button
        type="button"
        class="btn btn-red ml-auto"
        (click)="ref.close(false)"
      >
        Cancel
      </button>
      <button type="button" class="btn btn-green" (click)="accept()">
        Accept
      </button>
    </div>
  `
})
export class TosDialogComponent {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject<
    DynamicDialogConfig<{
      isFirstTime: boolean;
    }>
  >(DynamicDialogConfig);

  accept() {
    localStorage.setItem('tos', TOS_VERSION.toString());
    this.ref.close(true);
  }
}
