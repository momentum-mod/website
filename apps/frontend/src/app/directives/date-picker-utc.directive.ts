import { Directive, inject } from '@angular/core';
import { DatePicker as PDatePicker } from 'primeng/datepicker';

/**
 * Builds a PrimeNG date format (where `yy` is a four-digit year) from the
 * user's locale, e.g. `mm/dd/yy` for en-US, `dd/mm/yy` for en-GB.
 */
function getLocaleDateFormat(locale?: string | readonly string[]): string {
  try {
    return new Intl.DateTimeFormat(locale as string | string[], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(new Date(2000, 0, 1))
      .map(({ type, value }) => {
        switch (type) {
          case 'day':
            return 'dd';
          case 'month':
            return 'mm';
          case 'year':
            return 'yy';
          // Quote literals so letters in them aren't read as tokens.
          case 'literal':
            return /[a-z']/i.test(value)
              ? `'${value.replace(/'/g, "''")}'`
              : value;
          default:
            return '';
        }
      })
      .join('');
  } catch {
    return 'mm/dd/yy';
  }
}

/**
 * Converts the resulting date to UTC timezone, and formats/parses the date
 * according to the user's locale.
 *
 * Doesn't support range or multiple selection.
 */
@Directive({
  selector: 'p-date-picker[utc]'
})
export class DatePickerUTC {
  private host = inject(PDatePicker);
  constructor() {
    // Set before inputs are applied, so an explicit `dateFormat` still wins.
    this.host.dateFormat = getLocaleDateFormat(navigator.languages);
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
