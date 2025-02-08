import { ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';

/**
 * Extension of the built-in `ParseIntPipe` to restrict to numbers less than
 * `2^31 - 1`.
 *
 * This is most useful for params that correspond to database IDs (as most do);
 * since most of our IDs are stored as 32-bit signed integers and prisma would
 * throw an error if a param has a value above maximum 32-bit number, rather than
 * handle that in service logic, we can simply `400` immediately for any such request.
 */
@Injectable()
export class ParseInt32SafePipe extends ParseIntPipe {
  override async transform(
    value: string,
    _metadata: ArgumentMetadata
  ): Promise<number> {
    if (!this.isNumeric(value))
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)'
      );

    const parsed = Number.parseInt(value, 10);
    if (parsed > 2 ** 31 - 1)
      throw this.exceptionFactory(
        'Validation failed (numeric string must be a number less than 2^31)'
      );

    return parsed;
  }
}
