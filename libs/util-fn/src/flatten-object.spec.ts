import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { flattenObject } from './flatten-object';

describe('flattenObject', () => {
  it('flattens objects with nested properties', () => {
    assert.deepEqual(
      flattenObject({
        a: 1,
        b: { c: 2, d: { e: 3 } }
      }),
      {
        a: 1,
        'b.c': 2,
        'b.d.e': 3
      }
    );
  });

  it('flattens objects with arrays', () => {
    assert.deepEqual(
      flattenObject({
        a: [1, 2, 3],
        b: { c: [4, 5, 6] }
      }),
      {
        a: [1, 2, 3],
        'b.c': [4, 5, 6]
      }
    );
  });

  it('throws an error when max depth is exceeded', () => {
    assert.throws(() => flattenObject({ a: { b: { c: { d: 1 } } } }, 3), {
      message: 'Max depth exceeded'
    });
  });
});
