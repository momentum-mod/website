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
  // These are all the overloads from the base KeyValue pipe, we use a bunch of
  // them and unaware of a way to yoink every pair of Parameters and ReturnTypes
  override transform<K, V>(input: ReadonlyMap<K, V>): Array<KeyValue<K, V>>;
  override transform<K extends number, V>(
    input: Record<K, V>
  ): Array<KeyValue<string, V>>;
  override transform<K extends string, V>(
    input: Record<K, V> | ReadonlyMap<K, V>
  ): Array<KeyValue<K, V>>;
  override transform(input: null | undefined): null;
  override transform<K, V>(
    input: ReadonlyMap<K, V> | null | undefined
  ): Array<KeyValue<K, V>> | null;
  override transform<K extends number, V>(
    input: Record<K, V> | null | undefined
  ): Array<KeyValue<string, V>> | null;
  override transform<K extends string, V>(
    input: Record<K, V> | ReadonlyMap<K, V> | null | undefined
  ): Array<KeyValue<K, V>> | null {
    return super.transform(input as any, (a: any, _: any) => a);
  }
}
