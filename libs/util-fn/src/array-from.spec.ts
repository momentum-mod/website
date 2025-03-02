import { arrayFrom } from './array-from';

describe('from function', () => {
  it('should create an array of the specified length', () => {
    expect(arrayFrom(5)).toHaveLength(5);
  });

  it('should create an array with mapped values', () => {
    expect(arrayFrom(3, (n) => n * 2)).toEqual([0, 2, 4]);
  });

  it('should create an empty array if length is 0', () => {
    expect(arrayFrom(0)).toEqual([]);
  });

  it('should handle negative length', () => {
    expect(arrayFrom(-2)).toEqual([]);
  });

  it('should behave like Array.from if mapper fn is not provided', () => {
    expect(arrayFrom(3)).toEqual([undefined, undefined, undefined]);
    expect(arrayFrom(3)).toEqual(Array.from({ length: 3 }));

    expect(arrayFrom(3).map(() => 1)).not.toEqual(new Array(3).map(() => 1));
  });
});
