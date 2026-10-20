import * as assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isEmpty, undefinedIfEmpty } from './is-empty';

const testObj = { a: 1 };

describe('isEmpty', () => {
  test('should return true if object is empty or undefined', () => {
    assert.equal(isEmpty({}), true);
    assert.equal(isEmpty(undefined), true);
  });

  test('should return false if object is not empty', () => {
    assert.equal(isEmpty(testObj), false);
  });
});

describe('undefinedIfEmpty', () => {
  test('should return undefined if object is empty', () => {
    assert.equal(undefinedIfEmpty({}), undefined);
  });

  test('should return the object if it is not empty', () => {
    assert.equal(undefinedIfEmpty(testObj), testObj);
  });
});
