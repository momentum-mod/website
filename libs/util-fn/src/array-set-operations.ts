// Note: Some quick benchmarks suggest that on V8, using array methods here
// is actually faster than for loops.

/**
 * Take the intersection being two arrays `A` and `B`.
 */
export function intersection<Element>(
  a: Element[],
  b: unknown[]
): (Element | undefined)[] {
  return a.filter((x: Element) => b.includes(x));
}

/**
 * Take the difference being arrays `A` and `B`.
 */
export function difference<E1, E2>(a: E1[], b: E2[]): (E1 | E2 | undefined)[] {
  return a.filter((x: E1 | E2) => !b.includes(x as E2));
}

/**
 * Take the symmetrical difference being arrays `A` and `B`.
 */
export function symDiff<E1, E2>(a: E1[], b: E2[]): (E1 | E2 | undefined)[] {
  return [...difference(a, b), ...difference(b, a)];
}

// Not doing unions, just [...A, ...B].
