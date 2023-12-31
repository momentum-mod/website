import { Component, Input, OnInit } from '@angular/core';
import { ActivityType } from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { SharedModule } from '../../../../shared.module';

@Component({
  selector: 'm-map-info-notify-edit-modal',
  templateUrl: './map-info-notify-edit.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class MapNotifyEditComponent implements OnInit {
  protected readonly ActivityType = ActivityType;

  @Input() flags: number;

  checkboxFlags = {
    PB: { checked: false, value: ActivityType.PB_ACHIEVED },
    WR: { checked: false, value: ActivityType.WR_ACHIEVED }
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
