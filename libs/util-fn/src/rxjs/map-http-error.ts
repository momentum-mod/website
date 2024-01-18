import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, catchError, throwError, of } from 'rxjs';

/**
 * Catch an error, map a matching HTTP error code to an Observable of a given
 * value, otherwise rethrows the error.
 *
 * Basically just a shorthand for catchError using rethrowing with throwError
 *
 * @example
 * ```ts
 * UserService
 *   .getUsers
 *   .pipe(
 *     // Handle only 404 response, replacing with empty array
 *     mapHttpError(404, [])
 *   )
 * ```
 */
export function mapHttpError<T, MapTo extends T>(
  status: number | number[],
  mapTo: MapTo
): MonoTypeOperatorFunction<T> {
  return catchError((error: HttpErrorResponse) => {
    const test = Array.isArray(status)
      ? status.includes(error.status)
      : error.status === status;
    return test ? of(mapTo) : throwError(() => error);
  });
}
