import { findWithIndex } from './find-with-index';

describe('findWithIndex', () => {
  it('should return the found result and its index', () => {
    const array = [1, 2, 3, 4];
    const findFn = (value: number) => value === 3;
    const result = findWithIndex(array, findFn);
    expect(result).toEqual([3, 2]);
  });

  it('should return [undefined, -1] if not found', () => {
    const array = [1, 2, 3, 4];
    const findFn = (value: number) => value === 5;
    const result = findWithIndex(array, findFn);
    expect(result).toEqual([undefined, -1]);
  });
});
