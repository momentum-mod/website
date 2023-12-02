/**
 * Check if an object contains no enumerable properties.
 */
export function isEmpty(obj?: object) {
  // Using the highest-performance version according to
  // https://stackoverflow.com/a/59787784
  for (const _ in obj) {
    return false;
  }
  return true;
}

/**
 * Return undefined if provided object is empty, otherwise return the object.
 * Useful for Prisma includes.
 */
export function undefinedIfEmpty(obj: object) {
  return isEmpty(obj) ? undefined : obj;
}
