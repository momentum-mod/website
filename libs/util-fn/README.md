# util-fn

Library of helper functions. Similar to Lodash and its many offspring, but
Lodash itself is ancient and slow, and all the modern alternatives seem poorly
maintained.

Feel free to add/request things if needed. Unit tests are required, and
benchmarks welcome.

## Omissions

### pick

If you care about perf, just specifying each key manually is always going to be
faster than a function call.

If you really want a function, just this works:

```js
(({ a, b }) => ({ a, b }))(foo);
```

Or more commonly, for arrays, use

```js
arr.map(({ a, b }) => ({ a, b }));
```
