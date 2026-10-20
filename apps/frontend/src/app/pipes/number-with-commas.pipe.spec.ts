import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { NumberWithCommasPipe } from './number-with-commas.pipe';

describe('NumberWithCommasPipe', () => {
  let pipe: NumberWithCommasPipe;

  beforeEach(() => {
    pipe = new NumberWithCommasPipe();
  });

  it('should transform a number to a string with commas', () => {
    assert.equal(pipe.transform(1000), '1,000');
    assert.equal(pipe.transform(1000000), '1,000,000');
  });
});
