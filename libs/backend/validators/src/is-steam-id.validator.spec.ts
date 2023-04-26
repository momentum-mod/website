import { validate } from 'class-validator';
import { IsSteamCommunityID } from './is-steam-id.validator';

class TestClass {
  @IsSteamCommunityID()
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('IsSteamCommunityID', () => {
  it('should pass validation if the value is a string representing a uint64', async () => {
    const testObject = new TestClass('12345678901234567890');
    const errors = await validate(testObject);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation if the value is not a string representing a uint64', async () => {
    let testObject = new TestClass('A12312323123123');
    let errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isSteamCommunityID: 'value must be a string representing a uint64'
    });

    testObject = new TestClass('STEAM_0:0:39521483');
    errors = await validate(testObject);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toEqual({
      isSteamCommunityID: 'value must be a string representing a uint64'
    });
  });
});
