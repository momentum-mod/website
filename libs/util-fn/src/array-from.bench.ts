const ITERS = 1e6;
const ARRAY_SIZE = 10;

/* For 1e6, 10 I get:
 *    Array.from: 720.67ms
 *    Array.fill.map: 132.396ms
 *    Function to C-style for loop: 29.643ms
 *    Array.from without passing function: 681.591ms
 *
 * So C-style seems worth it. Important to note that whilst unicorn will
 * insist you use `Array.from` use `new Array`, `from` is significantly slower
 * as it sets every value to `undefined`.
 */
function bench(
  name: string,
  fn: (mapFn: (n: number) => number, length: number) => number[]
) {
  console.time(name);
  for (let i = 0; i < ITERS; i++) {
    fn((n) => n + 2, ARRAY_SIZE);
  }
  console.timeEnd(name);
}

bench('Array.from', (mapFn, length) =>
  Array.from({ length }, (_, n) => mapFn(n))
);

bench('Array.fill.map', (mapFn, length) =>
  new Array(length).fill(0).map((_, n) => mapFn(n))
);

bench('Function to C-style for loop with Array.from', (mapFn, length) => {
  const array: number[] = Array.from({ length });
  for (let i = 0; i < length; i++) {
    array[i] = mapFn(i);
  }
  return array;
});

bench(
  'Function to C-style for loop with Array constructor',
  (mapFn, length) => {
    const array: number[] = new Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = mapFn(i);
    }
    return array;
  }
);

bench(
  'Function to C-style for loop with Array constructor (explicit new)',
  (mapFn, length) => {
    const array: number[] = new Array(length);
    for (let i = 0; i < length; i++) {
      array[i] = mapFn(i);
    }
    return array;
  }
);

console.time('Array.from without passing function');
for (let i = 0; i < ITERS; i++) {
  Array.from({ length: ARRAY_SIZE }, (_, n) => n + 2);
}
console.timeEnd('Array.from without passing function');
