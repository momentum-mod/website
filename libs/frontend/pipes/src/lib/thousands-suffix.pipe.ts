import { Pipe, PipeTransform } from '@angular/core';

/**
 * Rounds really big numbers and puts a thousand/million/billion/trillion/etc
 * suffix on the end.
 *
 * @param precision the number of decimal places
 * @example
 * 122220000 | thousandsSuffix 1 // returns 122.2M
 */
@Pipe({ name: 'thousandsSuffix' })
export class ThousandsSuffixPipe implements PipeTransform {
  // Using 'B' instead of 'G' for billion.
  static suffixes = ['K', 'M', 'B', 'T', 'P', 'E'];

  static ln1000 = Math.log(1000);
  static log1000(x: number) {
    return Math.log(x) / this.ln1000; // By log_b x = log_a x / log_a b
  }

  transform(input: number, precision = 0): string {
    if (
      Number.isNaN(+input) ||
      Number.isNaN(+precision) ||
      !Number.isInteger(precision)
    ) {
      throw new TypeError(
        `Invalid numberThousands input - input: ${input}, precision: ${precision}`
      );
    }

    if (input < 1000) return input.toString();

    const exponent = Math.floor(ThousandsSuffixPipe.log1000(input));
    const numberString = (input / Math.pow(1000, exponent)).toFixed(precision);
    const suffix = ThousandsSuffixPipe.suffixes[exponent - 1];
    return `${numberString}${suffix}`;
  }
}
