import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'plural', standalone: true })
export class PluralPipe implements PipeTransform {
  transform(input = 0, label: string, pluralLabel: string = ''): string {
    if (input === 1) return `${input} ${label}`;
    else if (pluralLabel) return `${input} ${pluralLabel}`;
    else return `${input} ${label}s`;
  }
}
