import { Component, Input, OnInit } from '@angular/core';
import { NbDialogRef, NbInputModule } from '@nebular/theme';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'm-delete-user-dialog',
  templateUrl: './delete-user-dialog.component.html',
  standalone: true,
  imports: [NbInputModule, CardComponent]
})
export class DeleteUserDialogComponent implements OnInit {
  @Input() title: string;
  @Input() message: string;

  protected randomCode: string;
  protected isCodeValid: boolean;

  constructor(protected ref: NbDialogRef<DeleteUserDialogComponent>) {}

  ngOnInit(): void {
    this.randomCode = this.generateNewCode();
    this.isCodeValid = false;
  }

  private generateNewCode(): string {
    return Math.random().toString().slice(2, 8);
  }

  onCodeInput(event: Event) {
    this.isCodeValid =
      (event.target as HTMLInputElement).value === this.randomCode;
  }

  close() {
    this.ref.close(false);
  }

  submit() {
    if (!this.isCodeValid) return;
    this.ref.close(true);
  }
}
