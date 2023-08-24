import { intersection, difference, symDiff } from './array-set-operations';

describe('intersection', () => {
  it('should return an array containing the elements that are present in both input arrays', () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  it('should return an empty array if there are no common elements between the input arrays', () => {
    expect(intersection([1, 2, 3], [4, 5, 6])).toEqual([]);
  });
});

describe('difference', () => {
  it('should return an array containing the elements that are present in the first input array but not in the second', () => {
    expect(difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
  });

  it('should return a copy of the first input array if there are no common elements between the input arrays', () => {
    expect(difference([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3]);
  });
});

describe('symDiff', () => {
  it('should return an array containing the symmetric difference of the input arrays', () => {
    expect(symDiff([1, 2, 3], [2, 3, 4])).toEqual([1, 4]);
  });

  it('should return an empty array if the input arrays are equal', () => {
    expect(symDiff([1, 2, 3], [1, 2, 3])).toEqual([]);
  });

  it('should return a concatenated copy of the input arrays if they have no common elements', () => {
    expect(symDiff([1, 2, 3], [4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
