import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as Enum from '@momentum/enum';

/**
 * Parses a route param as an integer and validates it is a member of the
 * given numeric enum.
 *
 * Usage: `@Param('gamemode', new ParseEnumPipe(Gamemode)) gamemode: Gamemode`
 */
@Injectable()
export class ParseEnumPipe<T extends Record<string, string | number>>
  implements PipeTransform<string, number>
{
  private readonly values: number[];

  constructor(enumType: T) {
    this.values = Enum.values(enumType) as number[];
  }

  transform(value: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || !this.values.includes(parsed)) {
      throw new BadRequestException(
        `Validation failed: '${value}' is not one of ${this.values.join(', ')}`
      );
    }

    return parsed;
  }
}
