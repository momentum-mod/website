import { validate } from 'class-validator';
import { IsVector } from './is-vector.validator';

class TestClass {
  @IsVector(2)
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

class TestClass2 {
  @IsVector(2, { each: true })
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsVector', () => {
  it('should pass validation if the value is an 2 item array of numbers', async () => {
    const testObject = new TestClass([1, 2]);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is an 3 item array of numbers', async () => {
    const testObject = new TestClass([1, 2, 3]);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isVector: 'value must be an number array of length 2'
    });
  });

  it('should fail validation if the value is an 2 item array of non-numbers', async () => {
    const testObject = new TestClass([1, '2']);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isVector: 'value must be an number array of length 2'
    });
  });

  it('should pass validation if the value is an array of 2 item arrays of numbers', async () => {
    const testObject = new TestClass2([
      [1, 2],
      [3, 4]
    ]);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is an array of 3 item arrays of numbers', async () => {
    const testObject = new TestClass2([
      [1, 2, 3],
      [1, 2]
    ]);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isVector: 'value must be an number array of length 2'
    });
  });

  it('should fail validation if the value is an array of 2 item arrays of non-numbers', async () => {
    const testObject = new TestClass2([
      [1, 2],
      [1, '2']
    ]);
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isVector: 'value must be an number array of length 2'
    });
  });
});
