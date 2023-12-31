import { AbstractControl } from '@angular/forms';
import { MapCreditType } from '@momentum/constants';

// Not giving a type for AbstractControl as SortedMapCredits lives in frontend
// app which would violate a Nx boundary
export function creditsValidator(control: AbstractControl) {
  return control.value?.[MapCreditType.AUTHOR].length > 0
    ? null
    : { authorRequired: true };
}
