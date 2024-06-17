import { Component, Input, OnInit, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-confirm-dialog',
  template: `<div [innerHTML]="message"></div>
    <div class="grid grid-cols-2 gap-2">
      <button type="button" class="btn" (click)="ref.close(false)">
        Close
      </button>
      <button type="button" class="btn btn-blue" (click)="ref.close(true)">
        Submit
      </button>
    </div>`,
  standalone: true
})
export class ConfirmDialogComponent implements OnInit {
  @Input() message: SafeHtml;

  constructor(
    protected readonly ref: DynamicDialogRef,
    protected readonly config: DynamicDialogConfig<{ message: string }>,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    const sanitizedMessage = this.sanitizer.sanitize(
      SecurityContext.HTML,
      this.config.data.message.replaceAll('\n', '<br/>')
    );
    this.message = this.sanitizer.bypassSecurityTrustHtml(sanitizedMessage);
  }

  close(response: boolean) {
    this.ref.close(response);
  }
}
