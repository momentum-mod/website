/**
 * Shorthand for `Array.from({ length: n }, mapfn)` because I'm incredibly lazy.
 */
export function from<T>(n: number, fn: (v: unknown, k: number) => T): T[] {
  return Array.from({ length: n }, fn);
}
