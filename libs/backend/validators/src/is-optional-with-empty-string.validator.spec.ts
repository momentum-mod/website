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
    expect(errors1).toHaveLength(0);

    const testObject2 = new TestClass(undefined);
    const errors2 = await validate(testObject2);
    expect(errors2).toHaveLength(0);

    const testObject3 = new TestClass('');
    const errors3 = await validate(testObject3);
    expect(errors3).toHaveLength(0);
  });

  it('should apply the validation if the value is not null, undefined, or an empty string', async () => {
    const testObject1 = new TestClass('abc');
    const errors1 = await validate(testObject1);
    expect(errors1).toHaveLength(1);
    expect(errors1[0].constraints).toEqual({
      isInt: 'value must be an integer number'
    });

    const testObject2 = new TestClass(123);
    const errors2 = await validate(testObject2);
    expect(errors2).toHaveLength(0);
  });
});
