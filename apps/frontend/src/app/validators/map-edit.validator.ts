import { FormGroup } from '@angular/forms';

export function atLeastNRequired(numRequired: number, fieldNames: string[]) {
  return (formGroup: FormGroup) => {
    const hasAtLeastN =
      fieldNames.filter((field) => formGroup.get(field)?.value !== null)
        .length >= numRequired;
    return hasAtLeastN ? null : { atLeastNRequired: true };
  };
}
