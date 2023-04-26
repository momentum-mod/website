import { validate } from 'class-validator';
import { IsPositiveNumberString } from './is-positive-number-string.validator';

class TestClass {
  @IsPositiveNumberString()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsPositiveNumberString', () => {
  it('should pass validation if the value is a string representing a positive number', async () => {
    const testObject = new TestClass('123');
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is not a string representing a positive number', async () => {
    const testObject = new TestClass('-123');
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isPositiveNumberString:
        'value must be a string representing a positive number'
    });
  });
});
