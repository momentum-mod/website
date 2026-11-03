import { Component, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  DynamicDialogConfig,
  DynamicDialogRef
} from '@openng/optimus-ui/dynamicdialog';

@Component({
  selector: 'm-confirm-dialog',
  template: `<div [innerHTML]="message"></div>
    <div class="grid grid-cols-2 gap-2 mt-4">
      <button
        type="button"
        class="btn"
        (click)="ref.close(false)"
        [innerHTML]="abortMessage"
      ></button>
      <button
        type="button"
        class="btn btn-blue"
        (click)="ref.close(true)"
        [innerHTML]="proceedMessage"
      ></button>
    </div>`
})
export class ConfirmDialogComponent {
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
    this.config.data.proceedMessage ?? 'Submit'
  );

  private trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.sanitizer.sanitize(SecurityContext.HTML, html)
    );
  }

  close(response: boolean) {
    this.ref.close(response);
  }
}
