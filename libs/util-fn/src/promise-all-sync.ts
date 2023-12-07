/**
 * Promise.all, but synchronous!
 */
export async function promiseAllSync<T>(
  resolvables: Array<() => PromiseLike<T>>
): Promise<Awaited<T[]>> {
  const results = [];
  for (const resolvable of resolvables) {
    results.push(await resolvable());
  }
  return results;
}
