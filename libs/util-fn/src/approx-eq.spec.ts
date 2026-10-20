import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { approxEq } from './approx-eq';

describe('approxEq', () => {
  it('returns true for numbers within the default threshold', () => {
    assert.equal(approxEq(1.0000001, 1.0000002), true);
  });

  it('returns false for numbers outside the default threshold', () => {
    assert.equal(approxEq(1.000001, 1.00001), false);
  });

  it('returns true for numbers within a custom threshold', () => {
    assert.equal(approxEq(1.0001, 1.0002, 0.001), true);
  });

  it('returns false for numbers outside a custom threshold', () => {
    assert.equal(approxEq(1.0001, 1.0002, 0.00001), false);
  });

  it('returns true for identical numbers', () => {
    assert.equal(approxEq(1, 1), true);
  });
});
