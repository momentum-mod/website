import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as Enum from '@momentum/enum';

/**
 * Pipe that parses a route param string as an integer and validates it is a
 * member of the given numeric enum.
 *
 * Usage: @Param('gamemode', new ParseEnumPipe(Gamemode)) gamemode: Gamemode
 */
@Injectable()
export class ParseEnumPipe<T extends { [key: string]: string | number }>
  implements PipeTransform<string, number>
{
  constructor(private readonly enumType: T) {}

  transform(value: string): number {
    const parsed = Number.parseInt(value, 10);
    const validValues = Enum.values(this.enumType);

    if (
      !Number.isInteger(parsed) ||
      !(validValues as number[]).includes(parsed)
    ) {
      throw new BadRequestException(
        `Validation failed: '${value}' is not a valid enum value. ` +
          `Expected one of: ${validValues.join(', ')}`
      );
    }

    return parsed;
  }
}
