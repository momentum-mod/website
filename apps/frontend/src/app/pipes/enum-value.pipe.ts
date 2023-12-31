import { Pipe, PipeTransform } from '@angular/core';
import { Enum, NumericEnum } from '@momentum/enum';

@Pipe({ name: 'enumValue', standalone: true })
export class EnumValuePipe implements PipeTransform {
  transform(input: NumericEnum<unknown>): number[] {
    return Enum.values(input);
  }
}
