import { Directive, inject } from '@angular/core';
import { DatePicker as PDatePicker } from 'primeng/datepicker';

/**
 * Converts the resulting date to UTC timezone.
 *
 * Doesn't support range or multiple selection.
 */
@Directive({
  selector: 'p-date-picker[utc]'
})
export class DatePickerUTC {
  private host = inject(PDatePicker);
  constructor() {
    this.host.updateModel = (value: any) => this.updateModel(this.host, value);
  }

  // All changes (popup click, typed input, clear) go through here.
  updateModel(host: PDatePicker, value: any) {
    host.value = value;

    // Picker works in local time, we want the chosen date as midnight UTC.
    const modelValue =
      value instanceof Date
        ? new Date(
            Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
          )
        : value;

    host.writeModelValue(modelValue);
    host.onModelChange(modelValue);
  }
}
