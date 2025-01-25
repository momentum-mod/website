import { Component, Input, OnInit } from '@angular/core';
import { ActivityType } from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'm-profile-notify-edit-modal',
  templateUrl: './profile-notify-edit.component.html',
  imports: [SharedModule]
})
export class ProfileNotifyEditComponent implements OnInit {
  protected readonly ActivityType = ActivityType;

  @Input() flags: number;

  checkboxFlags = {
    pb: { checked: false, value: ActivityType.PB_ACHIEVED },
    wr: { checked: false, value: ActivityType.WR_ACHIEVED },
    approved: { checked: false, value: ActivityType.MAP_APPROVED },
    uploaded: { checked: false, value: ActivityType.MAP_UPLOADED }
  };

  constructor(private readonly ref: DynamicDialogRef) {}

  ngOnInit() {
    for (const [type, { value }] of Object.entries(this.checkboxFlags))
      // prettier-ignore
      // Prettier removes braces around `1 << value which` errors in WebStorm.
      // https://youtrack.jetbrains.com/issue/WEB-61626/Parsing-error-for-valid-Typescript-bit-shift-expression
      this.checkboxFlags[type].checked = Bitflags.has((1 << value), this.flags);
  }

  close() {
    this.ref.close();
  }

  submit() {
    for (const { checked, value } of Object.values(this.checkboxFlags))
      this.flags = checked
        ? Bitflags.add(this.flags, 1 << value)
        : Bitflags.remove(this.flags, 1 << value);
    this.ref.close({ newFlags: this.flags });
  }
}
