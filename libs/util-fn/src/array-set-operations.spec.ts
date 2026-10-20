import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { intersection, difference, symDiff } from './array-set-operations';

describe('intersection', () => {
  it('should return an array containing the elements that are present in both input arrays', () => {
    assert.deepEqual(intersection([1, 2, 3], [2, 3, 4]), [2, 3]);
  });

  it('should return an empty array if there are no common elements between the input arrays', () => {
    assert.deepEqual(intersection([1, 2, 3], [4, 5, 6]), []);
  });
});

describe('difference', () => {
  it('should return an array containing the elements that are present in the first input array but not in the second', () => {
    assert.deepEqual(difference([1, 2, 3], [2, 3, 4]), [1]);
  });

  it('should return a copy of the first input array if there are no common elements between the input arrays', () => {
    assert.deepEqual(difference([1, 2, 3], [4, 5, 6]), [1, 2, 3]);
  });
});

describe('symDiff', () => {
  it('should return an array containing the symmetric difference of the input arrays', () => {
    assert.deepEqual(symDiff([1, 2, 3], [2, 3, 4]), [1, 4]);
  });

  it('should return an empty array if the input arrays are equal', () => {
    assert.deepEqual(symDiff([1, 2, 3], [1, 2, 3]), []);
  });

  it('should return a concatenated copy of the input arrays if they have no common elements', () => {
    assert.deepEqual(symDiff([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
  });
});
