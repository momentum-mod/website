import { Component, Input, OnInit } from '@angular/core';
import { ActivityType } from '@momentum/constants';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'mom-map-info-notify-edit-modal',
  templateUrl: './map-info-notify-edit.component.html',
  styleUrls: ['./map-info-notify-edit.component.scss']
})
export class MapNotifyEditComponent implements OnInit {
  @Input() flags: number;
  ActivityType: typeof Activity_Type = Activity_Type;
  checkboxFlags = {
    PB: { checked: false, value: ActivityType.PB_ACHIEVED },
    WR: { checked: false, value: ActivityType.WR_ACHIEVED }
  };
  constructor(protected dialogRef: NbDialogRef<MapNotifyEditComponent>) {}

  ngOnInit() {
    for (const perm in this.checkboxFlags) {
      if ((1 << this.checkboxFlags[perm].value) & this.flags) {
        this.checkboxFlags[perm].checked = true;
      }
    }
  }

  close() {
    this.dialogRef.close();
  }

  submit() {
    for (const perm in this.checkboxFlags) {
      if (this.checkboxFlags[perm].checked) {
        this.flags |= 1 << this.checkboxFlags[perm].value;
      } else {
        this.flags &= ~(1 << this.checkboxFlags[perm].value);
      }
    }
    this.dialogRef.close({ newFlags: this.flags });
  }
}
