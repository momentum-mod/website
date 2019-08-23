import {Component, Input, OnInit} from '@angular/core';
import {Activity_Type} from '../../../../../@core/models/activity-type.model';
import {NbDialogRef} from '@nebular/theme';

@Component({
  selector: 'profile-notify-edit-modal',
  templateUrl: './profile-notify-edit.component.html',
  styleUrls: ['./profile-notify-edit.component.scss'],
})
export class ProfileNotifyEditComponent implements OnInit {

  @Input() flags: number;
  ActivityType: typeof Activity_Type = Activity_Type;
  checkboxFlags = {
    PB: {checked: false, value: Activity_Type.PB_ACHIEVED},
    WR: {checked: false, value: Activity_Type.WR_ACHIEVED},
    MAP_APPROVED: {checked: false, value: Activity_Type.MAP_APPROVED},
    MAP_UPLOADED: {checked: false, value: Activity_Type.MAP_UPLOADED},
  };

  constructor(protected dialogRef: NbDialogRef<ProfileNotifyEditComponent>) {
  }

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
        this.flags |= (1 << this.checkboxFlags[perm].value);
      } else
        this.flags &= ~(1 << this.checkboxFlags[perm].value);
    }
    this.dialogRef.close({newFlags: this.flags});
  }

}
