import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { of, tap } from 'rxjs';
import { mapHttpError } from './map-http-error';

describe('mapHttpError', () => {
  it('should map to provided value when status matches', () => {
    let value: string | undefined;
    of('Original Value')
      .pipe(
        tap(() => {
          throw { status: 404 };
        }),
        mapHttpError(404, 'Mapped Value')
      )
      .subscribe((result) => (value = result));

    assert.equal(value, 'Mapped Value');
  });

  it('should rethrow error when status does not match', () => {
    let actualError: unknown;
    of('Original Value')
      .pipe(
        tap(() => {
          throw { status: 500 };
        }),
        mapHttpError(404, 'Mapped Value')
      )
      .subscribe({
        error: (err) => {
          actualError = err;
        }
      });

    assert.deepEqual(actualError, { status: 500 });
  });
});
