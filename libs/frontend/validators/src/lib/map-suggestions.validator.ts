import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MapSubmissionSuggestion, MapZones } from '@momentum/constants';
import {
  SuggestionValidationError,
  validateSuggestions
} from '@momentum/formats';

export function suggestionsValidator(zoneGet: () => MapZones): ValidatorFn {
  return (
    control: AbstractControl<MapSubmissionSuggestion[]>
  ): ValidationErrors | null => {
    const zones = zoneGet();
    if (!zones) return { error: 'Zone file is missing!' };
    try {
      validateSuggestions(control.value, zones);
    } catch (error) {
      if (error instanceof SuggestionValidationError) {
        return { error: error.message };
      } else {
        return { error: 'Bad zones/suggestions somehow!' };
      }
    }
    return null;
  };
}
