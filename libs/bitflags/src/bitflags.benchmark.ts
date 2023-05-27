#!/usr/bin/env ts-node

// With 1000 iters:
//   joinFor small: 0.262ms
//   joinReduce small: 0.185ms
//   joinFor big: 2.518ms
//   joinReduce big: 12.166ms
// With 1000000:
//   joinFor small: 20.495ms
//   joinReduce small: 50.933ms
//   joinFor big: 1.567s
//   joinReduce big: 1.363s
// Interestingly, reduce gets progressively slower for bigger arrays, but for
// small stuff, it's fastest. So reduce is actually totally reasonable here.

const joinFor = (...flags: number[]): number => {
  if (flags.length === 1) return flags[0];
  let sum = flags[0];
  for (let i = 1; i < flags.length; i++) sum = sum | flags[i];
  return sum;
};

const joinReduce = (...flags: number[]): number =>
  flags.reduce((sum, current) => sum | current, 0);

const randomArr = (length: number): number[] =>
  Array.from({ length }, () => Math.floor(Math.random() * 2 ** 8));
const arrSmall = randomArr(5);
const arrBig = randomArr(1000);

const ITERS = 1000000;

console.time('joinFor small');
for (let i = 0; i < ITERS; i++) joinFor(...arrSmall);
console.timeEnd('joinFor small');

console.time('joinReduce small');
for (let i = 0; i < ITERS; i++) joinReduce(...arrSmall);
console.timeEnd('joinReduce small');

console.time('joinFor big');
for (let i = 0; i < ITERS; i++) joinFor(...arrBig);
console.timeEnd('joinFor big');

console.time('joinReduce big');
for (let i = 0; i < ITERS; i++) joinReduce(...arrBig);
console.timeEnd('joinReduce big');
