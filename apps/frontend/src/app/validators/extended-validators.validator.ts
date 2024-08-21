import * as Enum from '@momentum/enum';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class ExtendededValidators {
  static enum<T extends string | number>(
    _enum: Record<string, T>
  ): ValidatorFn {
    return (control: AbstractControl<T>): ValidationErrors | null => {
      return Enum.values(_enum).includes(control.value)
        ? null
        : {
            enumError: `${control.value} must be one of ${Enum.keys(_enum).join(
              ', '
            )}`
          };
    };
  }
}
