import { Component, Input } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-confirm-dialog',
  template: `<p>{{ message }}</p>
    <div class="grid grid-cols-2 gap-2">
      <button class="btn" (click)="ref.close(false)">Close</button>
      <button class="btn btn-blue" (click)="ref.close(true)">Submit</button>
    </div>`,
  standalone: true
})
export class ConfirmDialogComponent {
  @Input() message: string;

  constructor(protected readonly ref: DynamicDialogRef) {}

  close(response: boolean) {
    this.ref.close(response);
  }
}
