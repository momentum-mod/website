import { AbstractControl } from '@angular/forms';
import { MapCreditType } from '@momentum/constants';
import { GroupedMapCredits } from '../util';

export function creditsValidator(control: AbstractControl<GroupedMapCredits>) {
  return control.value?.[MapCreditType.AUTHOR].length > 0
    ? null
    : { authorRequired: true };
}
