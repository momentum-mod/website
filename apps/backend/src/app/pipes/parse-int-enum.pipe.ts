import { ArgumentMetadata, Injectable, ParseIntPipe } from '@nestjs/common';
import * as Enum from '@momentum/enum';

/**
 * Extension of the built-in `ParseIntPipe` to restrict to values of a numeric
 * enum.
 */
@Injectable()
export class ParseIntEnumPipe<
  T extends Record<string, string | number>
> extends ParseIntPipe {
  private readonly values: number[];

  constructor(enumType: T) {
    super();
    this.values = Enum.values(enumType) as number[];
  }

  override async transform(
    value: string,
    _metadata: ArgumentMetadata
  ): Promise<number> {
    if (!this.isNumeric(value))
      throw this.exceptionFactory(
        'Validation failed (numeric string is expected)'
      );

    const parsed = Number.parseInt(value, 10);
    if (!this.values.includes(parsed))
      throw this.exceptionFactory(
        `Validation failed (must be one of ${this.values.join(', ')})`
      );

    return parsed;
  }
}
