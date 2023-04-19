import { ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';

/**
 * Extension of the built-in `ParseIntPipe` to restrict to numbers less than `MAX_SAFE_INTEGER`.
 *
 * This is most useful for params that correspond to database IDs (as most do); none of our tables should ever exceed
 * `MAX_SAFE_INTEGER` (`2^53 - 1`) entries. However Prisma will (sensibly) error if a param has a value above `MAX_SAFE_INTEGER`,
 * so rather than handle that in service logic, we can simply `400` immediately for any such request.
 ***/
@Injectable()
export class ParseIntSafePipe extends ParseIntPipe {
  async transform(value: string, _metadata: ArgumentMetadata): Promise<number> {
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
