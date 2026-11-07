import { Component, SecurityContext, inject, signal } from '@angular/core';
import {
  DynamicDialogConfig,
  DynamicDialogRef
} from '@openng/optimus-ui/dynamicdialog';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'm-code-verify-dialog',
  template: `
    <div [innerHTML]="message"></div>
    <p>
      To confirm, please enter the following code:
      <b class="select-none">{{ randomCode }}</b>
    </p>
    <div class="relative mt-1 flex w-full items-stretch">
      <input
        (keyup)="onCodeInput($event)"
        type="text"
        class="textinput mb-1"
        placeholder="Verification code"
      />
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn" (click)="ref.close(false)">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-red"
        (click)="submit()"
        [disabled]="!isCodeValid()"
      >
        {{ actionText }}
      </button>
    </div>
  `
})
export class CodeVerifyDialogComponent {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject<
    DynamicDialogConfig<{
      message: string;
      actionText?: string;
    }>
  >(DynamicDialogConfig);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly message = this.sanitizer.bypassSecurityTrustHtml(
    this.sanitizer.sanitize(SecurityContext.HTML, this.config.data.message)
  );
  protected readonly actionText = this.config.data.actionText || 'Delete';
  protected readonly randomCode = Math.random().toString().slice(2, 8);
  protected readonly isCodeValid = signal(false);

  onCodeInput(event: Event) {
    this.isCodeValid.set(
      (event.target as HTMLInputElement).value === this.randomCode
    );
  }

  submit() {
    if (!this.isCodeValid()) return;
    this.ref.close(true);
  }
}
