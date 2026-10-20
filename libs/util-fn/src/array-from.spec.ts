import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { arrayFrom } from './array-from';

describe('from function', () => {
  it('should create an array of the specified length', () => {
    assert.equal(arrayFrom(5).length, 5);
  });

  it('should create an array with mapped values', () => {
    assert.deepEqual(
      arrayFrom(3, (n) => n * 2),
      [0, 2, 4]
    );
  });

  it('should create an empty array if length is 0', () => {
    assert.deepEqual(arrayFrom(0), []);
  });

  it('should handle negative length', () => {
    assert.deepEqual(arrayFrom(-2), []);
  });

  it('should behave like Array.from if mapper fn is not provided', () => {
    assert.deepEqual(arrayFrom(3), [undefined, undefined, undefined]);
    assert.deepEqual(arrayFrom(3), Array.from({ length: 3 }));

    assert.notDeepEqual(
      arrayFrom(3).map(() => 1),
      new Array(3).map(() => 1)
    );
  });
});
