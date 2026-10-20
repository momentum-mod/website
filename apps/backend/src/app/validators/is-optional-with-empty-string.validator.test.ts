import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validate, IsInt } from 'class-validator';
import { IsOptionalWithEmptyString } from './is-optional-with-empty-string.validator';

class TestClass {
  @IsOptionalWithEmptyString()
  @IsInt()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsOptionalWithEmptyString', () => {
  it('should pass validation if the value is null, undefined, or an empty string', async () => {
    const testObject1 = new TestClass(null);
    const errors1 = await validate(testObject1);
    assert.strictEqual(errors1.length, 0);

    const testObject2 = new TestClass(undefined);
    const errors2 = await validate(testObject2);
    assert.strictEqual(errors2.length, 0);

    const testObject3 = new TestClass('');
    const errors3 = await validate(testObject3);
    assert.strictEqual(errors3.length, 0);
  });

  it('should apply the validation if the value is not null, undefined, or an empty string', async () => {
    const testObject1 = new TestClass('abc');
    const errors1 = await validate(testObject1);
    assert.strictEqual(errors1.length, 1);
    assert.deepStrictEqual(errors1[0].constraints, {
      isInt: 'value must be an integer number'
    });

    const testObject2 = new TestClass(123);
    const errors2 = await validate(testObject2);
    assert.strictEqual(errors2.length, 0);
  });
});
