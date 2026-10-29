import { Pipe, PipeTransform } from '@angular/core';
import * as Enum from '@momentum/enum';

@Pipe({ name: 'enumValue', standalone: true })
export class EnumValuePipe implements PipeTransform {
  transform<T extends Enum.HeteroEnum<T>>(input: T): Enum.Values<T> {
    return Enum.values(input);
  }
}
