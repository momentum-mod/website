/**
 * Create an array of a given length, and map each element using a given
 * function. If a mapFn isn't provided, the array will be filled with
 * `undefined` (same as `Array.from({ length: n })`).
 *
 * Very similar to `Array.from({ length }).map((_, i) => ...))` but shorter,
 * doesn't require ignoring the first mapFn argument, and faster (see from.benchmark.ts).
 *
 * @param length - length of array to create
 * @param mapFn - mapper function applied to each item
 */
export function arrayFrom<T>(length: number, mapFn?: (i: number) => T): T[] {
  if (mapFn) {
    // Using Array.from is much slower, since it fills the array with
    // `undefined`. `new Array` inits a sparse array (every element is a hole /
    // "empty item"). If we were using Array.prototype.map this wouldn't work,
    // since iter methods ignore holes, but with a for-loop like this, holes
    // are fine since we're going to fill them anyway.
    // eslint-disable-next-line unicorn/no-new-array
    const array: T[] = new Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = mapFn(i);
    }
    return array;
  } else {
    // If we're not doing a mapping, use regular Array.from behaviour.
    // Even though slower, Array.from is better practice, holey arrays should
    // be avoided at all costs!
    return Array.from({ length });
  }
}
