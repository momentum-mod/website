import { Component, Input } from '@angular/core';
import { NbDialogRef, NbCardModule, NbButtonModule } from '@nebular/theme';

@Component({
  selector: 'mom-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: true,
  imports: [NbCardModule, NbButtonModule]
})
export class ConfirmDialogComponent {
  @Input() title: string;
  @Input() message: string;

  constructor(protected ref: NbDialogRef<ConfirmDialogComponent>) {}

  close(response: boolean) {
    this.ref.close(response);
  }
}
