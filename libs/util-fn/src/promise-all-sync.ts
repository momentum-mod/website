/**
 * Promise.all, but synchronous!
 */
export async function promiseAllSync<T>(
  resolvables: (() => Promise<T>)[]
): Promise<T[]> {
  const results = [];
  for (const resolvable of resolvables) {
    results.push(await resolvable());
  }
  return results;
}
