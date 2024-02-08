import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MapSubmissionSuggestion, MapZones } from '@momentum/constants';
import {
  SuggestionType,
  SuggestionValidationError,
  validateSuggestions
} from '@momentum/formats/zone';

export function suggestionsValidator(
  zoneGet: () => MapZones,
  type: SuggestionType
): ValidatorFn {
  return (
    control: AbstractControl<MapSubmissionSuggestion[]>
  ): ValidationErrors | null => {
    const zones = zoneGet();
    if (!zones) return { error: 'Zone file is missing!' };

    if (!control.value || control.value.length === 0) {
      if (type === SuggestionType.SUBMISSION) {
        return { error: 'Missing suggestions' };
      } else {
        return null;
      }
    }

    try {
      validateSuggestions(control.value, zones, type);
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
