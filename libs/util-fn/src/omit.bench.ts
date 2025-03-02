// Building up object seems faster, for small objects.
// 4 and 5 are fastest, and equivalent, interestly

function omitKeys1(
  obj: { [key: string]: any },
  keys: string | string[]
): { [key: string]: any } {
  const result = { ...obj };
  if (typeof keys === 'string') {
    delete result[keys];
  } else {
    for (const key of keys) {
      delete result[key];
    }
  }
  return result;
}

function omitKeys2(
  obj: Record<string, unknown>,
  keys: string | string[]
): { [key: string]: any } {
  return typeof keys === 'string'
    ? Object.keys(obj).reduce((result, key) => {
        if (keys !== key) {
          result[key] = obj[key];
        }
        return result;
      }, {})
    : Object.keys(obj).reduce(
        (result, key) => {
          if (!keys.includes(key)) {
            result[key] = obj[key];
          }
          return result;
        },
        {} as { [key: string]: any }
      );
}

function omitKeys3(
  obj: { [key: string]: any },
  keys: string | string[]
): { [key: string]: any } {
  const keyArray = typeof keys === 'string' ? [keys] : keys;
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keyArray.includes(key))
  );
}

function omitKeys4<T extends Record<string, unknown>>(
  obj: T,
  keys: string | string[]
): Partial<T> {
  if (typeof keys === 'string') {
    const result = {};
    for (const key of Object.keys(obj)) {
      if (keys !== key) {
        result[key] = obj[key];
      }
    }
    return result;
  } else {
    const result = {};
    for (const key of Object.keys(obj)) {
      if (keys.includes(key)) {
        result[key] = obj[key];
      }
    }
  }
}

function omitKeys5<T extends Record<string, unknown>>(
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
      if (keys.includes(key)) {
        result[key] = obj[key];
      }
    }
  }
  return result;
}

function bench(name, fn: (...args: unknown[]) => unknown, obj, keys) {
  const iters = 1e6;

  const benchName = `${name} ${fn.name}`;
  console.time(benchName);
  for (let i = 0; i < iters; i++) {
    fn(obj, keys);
  }
  console.timeEnd(benchName);
}

bench('single', omitKeys1, { a: 1, b: 2, c: 3, d: 4, e: 5 }, 'b');
bench('single', omitKeys2, { a: 1, b: 2, c: 3, d: 4, e: 5 }, 'b');
bench('single', omitKeys3, { a: 1, b: 2, c: 3, d: 4, e: 5 }, 'b');
bench('single', omitKeys4, { a: 1, b: 2, c: 3, d: 4, e: 5 }, 'b');
bench('single', omitKeys5, { a: 1, b: 2, c: 3, d: 4, e: 5 }, 'b');

bench('array', omitKeys1, { a: 1, b: 2, c: 3, d: 4, e: 5 }, ['b', 'c']);
bench('array', omitKeys2, { a: 1, b: 2, c: 3, d: 4, e: 5 }, ['b', 'c']);
bench('array', omitKeys3, { a: 1, b: 2, c: 3, d: 4, e: 5 }, ['b', 'c']);
bench('array', omitKeys4, { a: 1, b: 2, c: 3, d: 4, e: 5 }, ['b', 'c']);
bench('array', omitKeys5, { a: 1, b: 2, c: 3, d: 4, e: 5 }, ['b', 'c']);
