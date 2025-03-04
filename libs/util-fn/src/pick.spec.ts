import { pick } from './pick';

describe('pick', () => {
  it('returns an object with only the specified key when a single key is provided', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, 'a');
    expect(result).toEqual({ a: 1 });
  });

  it('returns an object with only the specified keys when an array of keys is provided', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, ['a', 'c']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('returns an empty object when none of the specified keys are present', () => {
    const obj = { a: 1, b: 2, c: 3 };
    // @ts-expect-error - intentionally testing non-existent keys
    const result = pick(obj, ['d', 'e']);
    expect(result).toEqual({});
  });

  it('returns an empty object when the input object is empty', () => {
    const obj = {};
    // @ts-expect-error - intentionally testing non-existent keys
    const result = pick(obj, ['a', 'b']);
    expect(result).toEqual({});
  });

  it('returns an empty object when the keys array is empty', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, []);
    expect(result).toEqual({});
  });

  it('returns an empty object when the key string is empty', () => {
    const obj = { a: 1, b: 2, c: 3 };
    // @ts-expect-error - intentionally testing non-existent keys
    const result = pick(obj, '');
    expect(result).toEqual({});
  });

  it('returns an object with only the specified key when the key is present multiple times', () => {
    // @ts-expect-error - intentionally testing duplicate keys
    const obj = { a: 1, b: 2, a: 3 };
    const result = pick(obj, 'a');
    expect(result).toEqual({ a: 3 });
  });

  it('returns an object with only the specified keys when the keys are present multiple times', () => {
    // @ts-expect-error - intentionally testing duplicate keys
    const obj = { a: 1, b: 2, a: 3, c: 4, c: 5 };
    const result = pick(obj, ['a', 'c']);
    expect(result).toEqual({ a: 3, c: 5 });
  });
});
