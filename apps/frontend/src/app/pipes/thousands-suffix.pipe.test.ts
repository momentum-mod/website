import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { ThousandsSuffixPipe } from './thousands-suffix.pipe';

describe('ThousandsSuffixPipe', () => {
  let pipe: ThousandsSuffixPipe;

  beforeEach(() => {
    pipe = new ThousandsSuffixPipe();
  });

  it('should create an instance', () => assert.ok(pipe));

  it('should return the input if it is less than 1000', () =>
    assert.equal(pipe.transform(500), '500'));

  it('should throw a TypeError if the input is NaN', () =>
    assert.throws(() => pipe.transform('A' as any), TypeError));

  it('should throw a TypeError if the precision is NaN', () =>
    assert.throws(() => pipe.transform(1000, 'A' as any), TypeError));

  it('should throw a TypeError if the precision is not an integer', () =>
    assert.throws(() => pipe.transform(1000, 1.5), TypeError));

  it('should return the input with a suffix if it is greater than or equal to 1000', () => {
    assert.equal(pipe.transform(1000), '1K');
    assert.equal(pipe.transform(1000000), '1M');
    assert.equal(pipe.transform(122220000, 1), '122.2M');
    assert.equal(pipe.transform(1000000000), '1B');
    assert.equal(pipe.transform(1234560000, 4), '1.2346B');
  });
});
