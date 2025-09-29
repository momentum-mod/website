import { sleep } from './sleep';

describe('sleep', () => {
  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    // Occasionally these resolve out-of-order in CI... Would've thought EL
    // would guarantee this... Probably Jest issue. Whatever.
    expect(end - start).toBeGreaterThanOrEqual(99);
  });

  it('resolves after a long duration', async () => {
    const start = Date.now();
    await sleep(1000);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(999);
  });

  it('handles negative duration by resolving immediately', async () => {
    const start = Date.now();
    await sleep(-100);
    const end = Date.now();
    expect(end - start).toBeLessThan(10);
  });
});
