import { Type } from '@nestjs/common';
import { IsString } from 'class-validator';
import { DtoFactory } from './functions';

/**
 * Envelope for a WebSocket handler response - the `{ event, data }` shape the
 * game client expects.
 *
 * `data` is run through {@link DtoFactory} against `c`, so any class-transformer
 * behaviour on the DTO is applied on the way out (e.g. `Date`s serialise to ISO
 * strings, `@Exclude`d fields are dropped). Handlers can therefore hand over raw
 * domain objects without pre-formatting them. Error payloads are passed through
 * untouched.
 */
export class WsResponseDto<T> {
  @IsString()
  readonly event: string;

  readonly data: T | { error: string };

  constructor(
    c: Type<T>,
    event: string,
    data: Record<string, unknown> | { error: string }
  ) {
    this.event = event;
    this.data =
      'error' in data
        ? (data as { error: string })
        : (DtoFactory(c, data) as T);
  }
}
