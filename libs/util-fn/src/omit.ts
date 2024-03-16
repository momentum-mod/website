export function omit<T extends object>(
  obj: T,
  keys: string | string[]
): Partial<T> {
  const result = {};
  for (const key of Object.keys(obj)) {
    if (typeof keys === 'string') {
      if (keys !== key) {
        result[key] = obj[key];
      }
    } else {
      if (!keys.includes(key)) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}
