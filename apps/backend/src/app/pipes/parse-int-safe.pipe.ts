﻿import { ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';

/**
 * Extension of the built-in `ParseIntPipe` to restrict to numbers less than
 * `MAX_SAFE_INTEGER`.
 */
@Injectable()
export class ParseIntSafePipe extends ParseIntPipe {
  override async transform(
    value: string,
    _metadata: ArgumentMetadata
  ): Promise<number> {
    if (!this.isNumeric(value))
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)'
      );

    const parsed = Number.parseInt(value, 10);
    if (parsed > Number.MAX_SAFE_INTEGER)
      throw this.exceptionFactory(
        'Validation failed (numeric string must be a number less than 2^53)'
      );

    return parsed;
  }
}
