import { Component, OnInit, inject } from '@angular/core';
import { ActivityType } from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import {
  DynamicDialogConfig,
  DynamicDialogRef
} from '@openng/optimus-ui/dynamicdialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'm-map-info-notify-edit-modal',
  imports: [FormsModule],
  templateUrl: './map-info-notify-edit.component.html'
})
export class MapNotifyEditComponent implements OnInit {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<{ flags: number }>>(DynamicDialogConfig);

  protected readonly ActivityType = ActivityType;

  private readonly flags = this.config.data?.flags ?? 0;

  protected readonly checkboxFlags = {
    WR: { checked: false, value: ActivityType.WR_ACHIEVED }
  };

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
    let flags = this.flags;
    for (const { checked, value } of Object.values(this.checkboxFlags))
      flags = checked
        ? Bitflags.add(flags, 1 << value)
        : Bitflags.remove(flags, 1 << value);
    this.ref.close({ newFlags: flags });
  }
}
