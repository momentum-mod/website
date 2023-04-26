import { validate } from 'class-validator';
import { IsBigintValidator } from './is-bigint.validator';

class TestClass {
  @IsBigintValidator()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsBigInt', () => {
  it('should pass validation if the value is a BigInt', async () => {
    const testObject = new TestClass(123n);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is not a BigInt', async () => {
    const testObject = new TestClass(123);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isBigInt: 'value must be a BigInt.'
    });
  });
});
