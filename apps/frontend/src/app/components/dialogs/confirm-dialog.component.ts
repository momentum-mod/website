import {
  Component,
  Input,
  OnInit,
  SecurityContext,
  inject
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-confirm-dialog',
  template: `<div [innerHTML]="message"></div>
    <div class="grid grid-cols-2 gap-2">
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
export class ConfirmDialogComponent implements OnInit {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject<
    DynamicDialogConfig<{
      message: string;
      abortMessage?: string;
      proceedMessage?: string;
    }>
  >(DynamicDialogConfig);
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) message: SafeHtml;
  @Input({ required: false }) abortMessage: SafeHtml;
  @Input({ required: false }) proceedMessage: SafeHtml;

  ngOnInit() {
    const sanitizedMessage = this.sanitizer.sanitize(
      SecurityContext.HTML,
      this.config.data.message.replaceAll('\n', '<br/>')
    );
    this.message = this.sanitizer.bypassSecurityTrustHtml(sanitizedMessage);

    const sanitizedAbortMessage = this.sanitizer.sanitize(
      SecurityContext.HTML,
      this.config.data.abortMessage ?? 'Close'
    );
    this.abortMessage = this.sanitizer.bypassSecurityTrustHtml(
      sanitizedAbortMessage
    );

    const sanitizedProceedMessage = this.sanitizer.sanitize(
      SecurityContext.HTML,
      this.config.data.proceedMessage ?? 'Submit'
    );
    this.proceedMessage = this.sanitizer.bypassSecurityTrustHtml(
      sanitizedProceedMessage
    );
  }

  close(response: boolean) {
    this.ref.close(response);
  }
}
