import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'm-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  standalone: true,
  imports: [CardComponent]
})
export class ConfirmDialogComponent {
  @Input() title: string;
  @Input() message: string;

  constructor(protected readonly ref: NbDialogRef<ConfirmDialogComponent>) {}

  close(response: boolean) {
    this.ref.close(response);
  }
}
