import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parallelLimit } from './parallel-limit';

describe('parallelLimit', () => {
  it('should return results in input order', async () => {
    const result = await parallelLimit(
      [30, 10, 20],
      3,
      (ms) =>
        new Promise<number>((resolve) => setTimeout(() => resolve(ms), ms))
    );
    assert.deepEqual(result, [30, 10, 20]);
  });

  it('should never exceed the concurrency limit', async () => {
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
    assert.ok(maxActive <= 4);
    assert.ok(maxActive > 1);
  });

  it('should handle empty input', async () => {
    assert.deepEqual(await parallelLimit([], 5, async (x) => x), []);
  });

  it('should reject when a call rejects', async () => {
    await assert.rejects(
      parallelLimit([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error('boom');
        return x;
      }),
      /boom/
    );
  });

  it('should reject an invalid limit', async () => {
    await assert.rejects(
      parallelLimit([1], 0, async (x) => x),
      RangeError
    );
  });
});
