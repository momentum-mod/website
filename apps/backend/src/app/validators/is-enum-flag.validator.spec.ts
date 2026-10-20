import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validate } from 'class-validator';
import { IsEnumFlag } from './is-enum-flag.validator';

enum TestEnum {
  A = 1 << 0,
  B = 1 << 1,
  C = 1 << 2
}

class TestClass {
  @IsEnumFlag(TestEnum)
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsEnumFlag', () => {
  it('should pass validation if the value is a valid flag of the enum', async () => {
    const testObject = new TestClass(TestEnum.A | TestEnum.B);
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 0);
  });

  it('should fail validation if the value is not a valid flag of the enum', async () => {
    const testObject = new TestClass(1 << 3);
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isFlagEnum: 'value is not a valid enum flag.'
    });
  });
});
