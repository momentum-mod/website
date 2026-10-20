import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { magic } from './magic';

describe('magic', () => {
  it('should return the correct magic number for a valid 4-character string', () => {
    assert.equal(magic('SPAM'), 1296126035);
  });

  it('should return -1 for a string shorter than 4 characters', () => {
    assert.equal(magic('SPA'), -1);
  });

  it('should return -1 for a string longer than 4 characters', () => {
    assert.equal(magic('SPAMF'), -1);
  });
});
