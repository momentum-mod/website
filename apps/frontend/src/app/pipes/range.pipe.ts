import { Pipe, PipeTransform } from '@angular/core';

/**
 * Returns a number[] between (start, stop], like a Python range().
 */
@Pipe({ name: 'range', standalone: true })
export class RangePipe implements PipeTransform {
  transform(start: number, stop?: number): number[] {
    if (!stop) {
      stop = start;
      start = 0;
    }

    return Array.from({ length: stop - start }, (_, i) => start + i);
  }
}
