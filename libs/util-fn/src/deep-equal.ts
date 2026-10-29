/**
 * Fast deep object comparison
 *
 * Taken from https://www.npmjs.com/package/fast-deep-equal
 *
 * Getting ArrayBuffers to pass our tests was giving me some trouble, and we
 * don't use them, so I left them out.
 */
export function deepEquals<T>(a: T, b: T): boolean {
  if (a === b) return true;

  if (a && b && typeof a == 'object' && typeof b == 'object') {
    if (a.constructor !== b.constructor) return false;

    let length: number;
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== (b as unknown[]).length) return false;
      const arrA = a as unknown[];
      const arrB = b as unknown[];
      for (let i = length; i-- !== 0; )
        if (!deepEquals(arrA[i], arrB[i])) return false;
      return true;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [key] of a.entries()) if (!b.has(key)) return false;
      for (const [key, val] of a.entries())
        if (!deepEquals(val, b.get(key))) return false;
      return true;
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (const val of a.values()) if (!b.has(val)) return false;
      return true;
    }

    if (ArrayBuffer.isView(a) || a instanceof ArrayBuffer) {
      throw new TypeError('Not implemented');
    }

    if (a.constructor === RegExp)
      return (
        (a as RegExp).source === (b as unknown as RegExp).source &&
        (a as RegExp).flags === (b as unknown as RegExp).flags
      );
    if (a.valueOf !== Object.prototype.valueOf)
      return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString)
      return a.toString() === b.toString();

    const keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) return false;

    for (let i = length; i-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(b, keys[i]!)) return false;

    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    for (let i = length; i-- !== 0; ) {
      const key = keys[i]!;
      if (!deepEquals(objA[key], objB[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  return a !== a && b !== b;
}
