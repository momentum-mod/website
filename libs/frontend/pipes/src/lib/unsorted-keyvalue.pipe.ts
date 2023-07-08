import { Pipe, PipeTransform } from '@angular/core';
import { KeyValuePipe } from '@angular/common';

/**
 * `keyvalue` without sorting.
 *
 * The standard `keyvalue` pipe has the extremely annoying behaviour of
 * automatically sorted everything passed into it, and to disable sorting, you
 * must define a `() => 0` or similar in any component using it. This pipe has
 * the same effect, without requiring that clutter.
 */
@Pipe({ name: 'unsortedKeyvalue' })
export class UnsortedKeyvaluePipe
  extends KeyValuePipe
  implements PipeTransform
{
  override transform(value: any): any {
    return super.transform(value, (a: any, _: any) => a);
  }
}
