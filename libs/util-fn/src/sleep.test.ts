import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sleep } from './sleep';

describe('sleep', () => {
  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    // Occasionally these resolve out-of-order in CI... Would've thought EL
    // would guarantee this... Probably Jest issue. Whatever.
    assert.ok(end - start >= 99);
  });

  it('resolves after a long duration', async () => {
    const start = Date.now();
    await sleep(1000);
    const end = Date.now();
    assert.ok(end - start >= 999);
  });

  it('handles negative duration by resolving immediately', async () => {
    const start = Date.now();
    await sleep(-100);
    const end = Date.now();
    assert.ok(end - start < 10);
  });
});
