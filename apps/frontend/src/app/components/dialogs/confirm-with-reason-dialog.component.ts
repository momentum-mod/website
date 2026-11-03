import { Component, SecurityContext, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  DynamicDialogConfig,
  DynamicDialogRef
} from '@openng/optimus-ui/dynamicdialog';
import { FormsModule } from '@angular/forms';
export interface ConfirmWithReasonDialogResult {
  confirmed: boolean;
  reason: string;
}

@Component({
  selector: 'm-confirm-with-reason-dialog',
  imports: [FormsModule],
  template: `<div [innerHTML]="message"></div>
    <textarea
      class="textinput w-full mt-3"
      placeholder="Reason"
      rows="3"
      [(ngModel)]="reason"
    ></textarea>
    <div class="grid grid-cols-2 gap-2 mt-4">
      <button
        type="button"
        class="btn"
        (click)="ref.close({ confirmed: false })"
        [innerHTML]="abortMessage"
      ></button>
      <button
        type="button"
        class="btn btn-blue"
        (click)="close(true)"
        [innerHTML]="proceedMessage"
      ></button>
    </div>`
})
export class ConfirmWithReasonDialogComponent {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject<
    DynamicDialogConfig<{
      message: string;
      abortMessage?: string;
      proceedMessage?: string;
    }>
  >(DynamicDialogConfig);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly message = this.trust(
    this.config.data.message.replaceAll('\n', '<br/>')
  );
  protected readonly abortMessage = this.trust(
    this.config.data.abortMessage ?? 'Close'
  );
  protected readonly proceedMessage = this.trust(
    this.config.data.proceedMessage ?? 'Confirm'
  );

  protected readonly reason = signal('');

  private trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.sanitizer.sanitize(SecurityContext.HTML, html)
    );
  }

  close(confirmed: boolean) {
    this.ref.close({ confirmed, reason: this.reason() });
  }
}
