import {Component, Input, OnInit} from '@angular/core';
import {NbDialogRef} from '@nebular/theme';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent implements OnInit {

  @Input() title: string;
  @Input() message: string;

  constructor(protected ref: NbDialogRef<ConfirmDialogComponent>) { }

  ngOnInit() {
  }

  close(response: boolean) {
    this.ref.close(response);
  }

}
