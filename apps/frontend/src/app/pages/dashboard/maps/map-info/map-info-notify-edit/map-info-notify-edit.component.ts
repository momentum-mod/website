import { Component, Input, OnInit } from '@angular/core';
import { ActivityType } from '@momentum/constants';
import { NbDialogRef } from '@nebular/theme';
import { Bitflags } from '@momentum/bitflags';

@Component({
  selector: 'mom-map-info-notify-edit-modal',
  templateUrl: './map-info-notify-edit.component.html',
  styleUrls: ['./map-info-notify-edit.component.scss']
})
export class MapNotifyEditComponent implements OnInit {
  @Input() flags: number;
  protected readonly ActivityType = ActivityType;
  checkboxFlags = {
    PB: { checked: false, value: ActivityType.PB_ACHIEVED },
    WR: { checked: false, value: ActivityType.WR_ACHIEVED }
  };
  constructor(protected dialogRef: NbDialogRef<MapNotifyEditComponent>) {}

  ngOnInit() {
    for (const [type, { value }] of Object.entries(this.checkboxFlags))
      // prettier-ignore
      // Prettier removes braces around `1 << value which` errors in WebStorm.
      // https://youtrack.jetbrains.com/issue/WEB-61626/Parsing-error-for-valid-Typescript-bit-shift-expression
      this.checkboxFlags[type].checked = Bitflags.has((1 << value), this.flags);
  }

  close() {
    this.dialogRef.close();
  }

  submit() {
    for (const { checked, value } of Object.values(this.checkboxFlags))
      this.flags = checked
        ? Bitflags.add(this.flags, 1 << value)
        : Bitflags.remove(this.flags, 1 << value);
    this.dialogRef.close({ newFlags: this.flags });
  }
}
