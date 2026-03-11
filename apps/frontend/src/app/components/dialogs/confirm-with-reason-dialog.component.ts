import {
  Component,
  Input,
  OnInit,
  SecurityContext,
  inject
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
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
        (click)="ref.close({ confirmed: true, reason })"
        [innerHTML]="proceedMessage"
      ></button>
    </div>`
})
export class ConfirmWithReasonDialogComponent implements OnInit {
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

  protected reason = '';

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
      this.config.data.proceedMessage ?? 'Confirm'
    );
    this.proceedMessage = this.sanitizer.bypassSecurityTrustHtml(
      sanitizedProceedMessage
    );
  }

  close(confirmed: boolean) {
    this.ref.close({ confirmed, reason: this.reason });
  }
}
