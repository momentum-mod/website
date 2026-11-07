import { Directive, inject } from '@angular/core';
import { DatePicker as PDatePicker } from '@openng/optimus-ui/datepicker';

/**
 * Converts the resulting date to UTC timezone.
 *
 * Doesn't support range or multiple selection.
 */
@Directive({
  // Since we're hijack the PrimeNG/OptimusUI datepicker
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'p-date-picker[utc]'
})
export class DatePickerUTC {
  private host = inject(PDatePicker);
  constructor() {
    this.host.selectDate = (dateMeta: any) =>
      this.selectDate(this.host, dateMeta);
    this.host.updateModel = (value: any) => this.updateModel(this.host, value);
  }

  selectDate(host: PDatePicker, dateMeta: any) {
    const date = host.formatDateMetaToDate(dateMeta);

    this.updateModel(host, date, dateMeta);
    host.onSelect.emit(date);
  }

  updateModel(host: PDatePicker, value: any, dateMeta?: any) {
    host.value = value;

    if (dateMeta) {
      const date = new Date(
        Date.UTC(dateMeta.year, dateMeta.month, dateMeta.day)
      );
      host.writeModelValue(date);
      host.onModelChange(date);
    }
  }
}
