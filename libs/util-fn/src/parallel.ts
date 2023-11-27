type AwaitedReturnTypes<
  T extends Array<((...a: any[]) => PromiseLike<any>) | PromiseLike<any>>
> = {
  [P in keyof T]: T[P] extends (..._: any[]) => infer R
    ? Awaited<R>
    : T[P] extends PromiseLike<any>
      ? Awaited<T[P]>
      : never;
};

/**
 * Run several 0-argument functions in parallel.
 *
 * Useful for executing several blocks of inline code at once, without needing
 * to use IIFEs, or wrapping IIFEs/method calls in an array to pass to
 * `Promise.all`.
 */
export function parallel<
  T extends Array<(() => PromiseLike<any>) | PromiseLike<any>>
>(...vals: T): Promise<AwaitedReturnTypes<T>> {
  return Promise.all(
    vals.map(async (v) =>
      typeof v === 'function' ? await v() : v
    ) as AwaitedReturnTypes<T>
  );
}
