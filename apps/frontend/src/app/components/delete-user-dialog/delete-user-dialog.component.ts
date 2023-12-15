import { Component, Input, OnInit } from '@angular/core';
import { CardComponent } from '../card/card.component';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'm-delete-user-dialog',
  templateUrl: './delete-user-dialog.component.html',
  standalone: true,
  imports: [CardComponent]
})
export class DeleteUserDialogComponent implements OnInit {
  @Input() title: string;
  @Input() message: string;

  protected randomCode: string;
  protected isCodeValid: boolean;

  constructor(protected readonly ref: DynamicDialogRef) {}

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

  submit() {
    if (!this.isCodeValid) return;
    this.ref.close(true);
  }
}
