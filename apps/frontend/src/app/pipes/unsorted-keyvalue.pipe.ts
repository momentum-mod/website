import { Pipe, PipeTransform } from '@angular/core';
import { KeyValue, KeyValuePipe } from '@angular/common';

/**
 * `keyvalue` without sorting.
 *
 * The standard `keyvalue` pipe has the extremely annoying behaviour of
 * automatically sorted everything passed into it, and to disable sorting, you
 * must define a `() => 0` or similar in any component using it. This pipe has
 * the same effect, without requiring that clutter.
 */
@Pipe({ name: 'unsortedKeyvalue', standalone: true })
export class UnsortedKeyvaluePipe
  extends KeyValuePipe
  implements PipeTransform
{
  // @ts-expect-error - Too annoying to get this wrangle TypeScript into
  // accepting this override. Yes I know it breaks OO rules. No I don't care
  override transform<K extends string, V>(
    value: Record<K, V> | Partial<Record<K, V>> | ReadonlyMap<K, V>
  ): Array<KeyValue<K, V>> {
    return super.transform(value as any, (a: any, _: any) => a);
  }
}
