import { omit } from './omit';

describe('omit function', () => {
  it('should omit a single key from the object', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, 'b')).toEqual({ a: 1, c: 3 });
  });

  it('should omit multiple keys from the object', () => {
    expect(omit({ a: 1, b: 2, c: 3, d: 4 }, ['b', 'd'])).toEqual({
      a: 1,
      c: 3
    });
  });

  it('should return the same object if the key does not exist', () => {
    // @ts-expect-error - testing invalid keys
    expect(omit({ a: 1, b: 2, c: 3 }, 'd')).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should return an empty object if all keys are omitted', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['a', 'b', 'c'])).toEqual({});
  });
});
