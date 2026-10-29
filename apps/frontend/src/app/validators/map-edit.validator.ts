import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function atLeastNRequired(
  numRequired: number,
  fieldNames: string[]
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const hasAtLeastN =
      fieldNames.filter((field) => control.get(field)?.value !== null).length >=
      numRequired;
    return hasAtLeastN ? null : { atLeastNRequired: true };
  };
}
