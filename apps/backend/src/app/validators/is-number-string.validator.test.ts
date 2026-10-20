import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validate } from 'class-validator';
import { IsNumberString } from './is-number-string.validator';

class TestClass {
  @IsNumberString()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsNumberString', () => {
  it('should pass validation if the value is a string representing a number', async () => {
    const testObject = new TestClass('123');
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 0);
  });

  it('should fail validation if the value is not a string representing a number', async () => {
    const testObject = new TestClass('abc');
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isNumberString: 'value must be a string representing a number'
    });
  });
});
