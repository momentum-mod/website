import { validate } from 'class-validator';
import { IsMapName } from './is-map-name.validator';

class TestClass {
  @IsMapName()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsMapName', () => {
  it('should pass validation if the value is a valid map name', async () => {
    const testObject = new TestClass('de_dust2');
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is not a valid map name', async () => {
    const testObject = new TestClass('de_dust2!');
    const errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isMapName:
        'value is not a valid map name. It should contain only alphanumeric characters and the _ and - characters'
    });
  });
});
