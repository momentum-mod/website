import { sleep } from './sleep';

describe('sleep', () => {
  it('resolves after the specified duration', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  });

  it('resolves after a long duration', async () => {
    const start = Date.now();
    await sleep(1000);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });

  it('handles negative duration by resolving immediately', async () => {
    const start = Date.now();
    await sleep(-100);
    const end = Date.now();
    expect(end - start).toBeLessThan(10);
  });
});
