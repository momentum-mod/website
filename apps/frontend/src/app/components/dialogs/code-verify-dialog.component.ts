import { Component, Input, OnInit, SecurityContext } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CardComponent } from '../card/card.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
        [disabled]="!this.isCodeValid"
      >
        {{ actionText }}
      </button>
    </div>
  `,
  standalone: true,
  imports: [CardComponent]
})
export class CodeVerifyDialogComponent implements OnInit {
  @Input() message: SafeHtml;
  @Input() actionText = 'Delete';

  protected randomCode: string;
  protected isCodeValid: boolean;

  constructor(
    protected readonly ref: DynamicDialogRef,
    protected readonly config: DynamicDialogConfig<{
      message: string;
      actionText?: string;
    }>,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.randomCode = this.generateNewCode();
    this.isCodeValid = false;

    if (this.config.data.actionText) {
      this.actionText = this.config.data.actionText;
    }

    const sanitizedMessage = this.sanitizer.sanitize(
      SecurityContext.HTML,
      this.config.data.message
    );
    this.message = this.sanitizer.bypassSecurityTrustHtml(sanitizedMessage);
  }

  private generateNewCode(): string {
    return Math.random().toString().slice(2, 8);
  }

  onCodeInput(event: Event) {
    this.isCodeValid =
      (event.target as HTMLInputElement).value === this.randomCode;
  }

  submit() {
    if (!this.isCodeValid) return;
    this.ref.close(true);
  }
}
