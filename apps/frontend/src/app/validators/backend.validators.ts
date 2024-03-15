import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { Observable, map, of, switchMap, delay } from 'rxjs';
import { MapsService } from '../services/data/maps.service';

export class BackendValidators {
  // Rather than following https://angular.io/guide/form-validation#adding-async-validators-to-reactive-forms
  // which does a class for every validator and ties itself in knots doing DI
  // in a super ugly way. Instead just use a closure we can pass the required
  // services into.
  static uniqueMapName(
    mapsService: MapsService,
    allow?: () => string
  ): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (
        !control.value ||
        typeof control.value != 'string' ||
        control.value === allow?.()
      )
        return of(null);

      if (!Number.isNaN(Number(control.value))) {
        return of({ badMapName: 'Name cannot be a number' });
      }

      return of(control.value).pipe(
        delay(500),
        switchMap((name) =>
          mapsService
            .testMapExists(name)
            .pipe(map((exists) => (exists ? { uniqueMapName: true } : null)))
        )
      );
    };
  }
}
