import { promiseAllSync } from './promise-all-sync';

describe('promiseAllSync', () => {
  it('should resolve all promises synchronously', async () => {
    const resolvables = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3)
    ];
    const result = await promiseAllSync(resolvables);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should resolve each async function before calling the next (using setTimeout)', async () => {
    let order = '';
    const resolvables = [
      async () =>
        new Promise((resolve) =>
          setTimeout(() => {
            order += '1';
            resolve(1);
          }, 100)
        ),
      async () =>
        new Promise((resolve) =>
          setTimeout(() => {
            order += '2';
            resolve(2);
          }, 50)
        ),
      async () =>
        new Promise((resolve) =>
          setTimeout(() => {
            order += '3';
            resolve(3);
          }, 10)
        )
    ];
    await promiseAllSync(resolvables);
    expect(order).toEqual('123');
  });
});
