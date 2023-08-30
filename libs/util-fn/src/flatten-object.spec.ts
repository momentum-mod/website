import { flattenObject } from './flatten-object';

describe('flattenObject', () => {
  it('flattens objects with nested properties', () => {
    expect(
      flattenObject({
        a: 1,
        b: { c: 2, d: { e: 3 } }
      })
    ).toEqual({
      a: 1,
      'b.c': 2,
      'b.d.e': 3
    });
  });

  it('flattens objects with arrays', () => {
    expect(
      flattenObject({
        a: [1, 2, 3],
        b: { c: [4, 5, 6] }
      })
    ).toEqual({
      a: [1, 2, 3],
      'b.c': [4, 5, 6]
    });
  });

  it('throws an error when max depth is exceeded', () => {
    expect(() => flattenObject({ a: { b: { c: { d: 1 } } } }, 3)).toThrowError(
      'Max depth exceeded'
    );
  });
});
