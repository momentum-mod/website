import { parallelLimit } from './parallel-limit';

describe('parallelLimit', () => {
  it('returns results in input order', async () => {
    const result = await parallelLimit(
      [30, 10, 20],
      3,
      (ms) =>
        new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms))
    );
    expect(result).toEqual([30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    await parallelLimit(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
      }
    );
    expect(maxActive).toBeLessThanOrEqual(4);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('handles empty input', async () => {
    expect(await parallelLimit([], 5, async (x) => x)).toEqual([]);
  });

  it('rejects when a call rejects', async () => {
    await expect(
      parallelLimit([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error('boom');
        return x;
      })
    ).rejects.toThrow('boom');
  });

  it('rejects an invalid limit', async () => {
    await expect(parallelLimit([1], 0, async (x) => x)).rejects.toThrow(
      RangeError
    );
  });
});
