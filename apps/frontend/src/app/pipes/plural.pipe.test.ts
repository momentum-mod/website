import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { PluralPipe } from './plural.pipe';

describe('PluralPipe', () => {
  let pipe: PluralPipe;

  beforeEach(() => {
    pipe = new PluralPipe();
  });

  it('should transform a number to a pluralized string', () => {
    assert.equal(pipe.transform(1, 'cat'), '1 cat');
    assert.equal(pipe.transform(2, 'cat'), '2 cats');
    assert.equal(pipe.transform(3, 'child', 'children'), '3 children');
  });
});
