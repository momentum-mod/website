import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validate } from 'class-validator';
import { IsBigInt } from './is-bigint.validator';

class TestClass {
  @IsBigInt()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsBigInt', () => {
  it('should pass validation if the value is a BigInt', async () => {
    const testObject = new TestClass(123n);
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 0);
  });

  it('should fail validation if the value is not a BigInt', async () => {
    const testObject = new TestClass(123);
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isBigInt: 'value must be a BigInt.'
    });
  });
});
