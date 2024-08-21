import { Pipe, PipeTransform } from '@angular/core';
import * as Enum from '@momentum/enum';

@Pipe({ name: 'enumValue', standalone: true })
export class EnumValuePipe implements PipeTransform {
  transform(input: Enum.NumericEnum<unknown>): number[] {
    return Enum.values(input);
  }
}
