import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isObject } from './is-object';

describe('isObject', () => {
  it('should return true for objects', () => {
    assert.equal(isObject({}), true);
    assert.equal(isObject({ a: 1 }), true);
    assert.equal(isObject(new Date()), true);
  });

  it('should return false for non-objects', () => {
    assert.equal(isObject(null), false);
    assert.equal(isObject(undefined), false);
    assert.equal(isObject(42), false);
    assert.equal(isObject('string'), false);
    assert.equal(isObject(true), false);
    assert.equal(isObject([1, 2, 3]), false);
    assert.equal(
      isObject(() => {}),
      false
    );
  });
});
