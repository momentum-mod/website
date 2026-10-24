import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { EnumValuePipe } from './enum-value.pipe';

describe('NumberWithCommasPipe', () => {
  let pipe: EnumValuePipe;

  enum TestEnum {
    A = 0,
    B = 1,
    C = 8
  }

  beforeEach(() => {
    pipe = new EnumValuePipe();
  });

  it('should transform a number to a string with commas', () => {
    assert.deepStrictEqual(pipe.transform(TestEnum), [0, 1, 8]);
  });
});
