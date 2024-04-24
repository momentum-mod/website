import { of, tap } from 'rxjs';
import { mapHttpError } from './map-http-error';

describe('mapHttpError', () => {
  it('should map to provided value when status matches', (done) => {
    of('Original Value')
      .pipe(
        tap(() => {
          throw { status: 404 };
        }),
        mapHttpError(404, 'Mapped Value')
      )
      .subscribe({
        next: (value) => expect(value).toBe('Mapped Value'),
        complete: () => done()
      });
  });

  it('should rethrow error when status does not match', (done) => {
    of('Original Value')
      .pipe(
        tap(() => {
          throw { status: 500 };
        }),
        mapHttpError(404, 'Mapped Value')
      )
      .subscribe({
        error: (err) => {
          expect(err).toEqual({ status: 500 });
          done();
        }
      });
  });
});
