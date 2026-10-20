import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { omit } from './omit';

describe('omit function', () => {
  it('should omit a single key from the object', () => {
    assert.deepEqual(omit({ a: 1, b: 2, c: 3 }, 'b'), { a: 1, c: 3 });
  });

  it('should omit multiple keys from the object', () => {
    assert.deepEqual(omit({ a: 1, b: 2, c: 3, d: 4 }, ['b', 'd']), {
      a: 1,
      c: 3
    });
  });

  it('should return the same object if the key does not exist', () => {
    // @ts-expect-error - testing invalid keys
    assert.deepEqual(omit({ a: 1, b: 2, c: 3 }, 'd'), { a: 1, b: 2, c: 3 });
  });

  it('should return an empty object if all keys are omitted', () => {
    assert.deepEqual(omit({ a: 1, b: 2, c: 3 }, ['a', 'b', 'c']), {});
  });
});
