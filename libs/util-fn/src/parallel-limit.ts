/**
 * Map over `items` with `fn`, running at most `limit` calls concurrently.
 * Results are returned in input order. Rejects on the first error, like
 * `Promise.all`.
 */
export async function parallelLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError(`limit must be a positive integer, got ${limit}`);

  const results: R[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}
