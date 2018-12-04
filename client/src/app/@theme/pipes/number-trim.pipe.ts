import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'numberTrim' })
export class NumberTrimPipe implements PipeTransform {

  transform(input: number): string {
    return input.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
  }
}
