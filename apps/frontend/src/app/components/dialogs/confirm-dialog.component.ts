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
      <button type="button" class="btn" (click)="ref.close(false)">
        Close
      </button>
      <button type="button" class="btn btn-blue" (click)="ref.close(true)">
        Submit
      </button>
    </div>`
})
export class ConfirmDialogComponent implements OnInit {
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly config = inject<
    DynamicDialogConfig<{
      message: string;
    }>
  >(DynamicDialogConfig);
  private sanitizer = inject(DomSanitizer);

  @Input() message: SafeHtml;

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
