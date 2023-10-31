import { parallel } from './parallel';

describe('parallel', () => {
  const returnAfter10ms = <T>(arg: T) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(arg), 10));

  it('should resolve with an array of resolved values', async () => {
    // Not doing any type tests but note that TypeScript infers this to
    // Promise<["Hello", "World", 123, string, number]>. I feel very clever!
    const resolved = await parallel(
      async () => 'Hello',
      async () => 'World',
      async () => 123,
      returnAfter10ms('Hi'),
      returnAfter10ms(456)
    );
    expect(resolved).toEqual(['Hello', 'World', 123, 'Hi', 456]);
  });

  it('should handle empty input', async () => {
    expect(await parallel()).toEqual([]);
  });

  it('should reject if any of the promises reject', async () => {
    await expect(
      parallel(
        async () => 'Hello',
        async () => {
          throw new Error('Oops!');
        }
      )
    ).rejects.toThrow('Oops!');
  });
});
