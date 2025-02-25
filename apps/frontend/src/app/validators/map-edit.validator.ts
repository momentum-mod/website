import { FormGroup } from '@angular/forms';

export function atLeastOneFileRequired(fieldNames: string[]) {
  return (formGroup: FormGroup) => {
    const hasAtLeastOne = fieldNames.some(
      (field) => formGroup.get(field)?.value !== null
    );
    return hasAtLeastOne ? null : { atLeastOneRequired: true };
  };
}
