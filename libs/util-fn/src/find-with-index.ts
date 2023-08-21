/**
 * Perform an `Array.find`, return a tuple of the found result and its index.
 * Returns [undefined, -1] if not found.
 */
export function findWithIndex<T>(
  array: T[],
  findFn: (value: T, index: number, obj: T[]) => unknown
): [T | undefined, number] {
  const index = array.findIndex(findFn);
  return [array[index], index];
}
