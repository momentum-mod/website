import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
    assert.strictEqual(errors.length, 0);
  });

  it('should fail validation if the value is not a valid map name', async () => {
    const testObject = new TestClass('de_dust2!');
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isMapName:
        'value is not a valid map name. It should contain only alphanumeric characters and the _ and - characters'
    });
  });

  it('should fail validation if the value starts with a number', async () => {
    const testObject = new TestClass('1de_dust2');
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isMapName:
        'value is not a valid map name. It should contain only alphanumeric characters and the _ and - characters'
    });
  });

  it('should fail validation if the value constants an uppercase char', async () => {
    const testObject = new TestClass('1de_Dust2');
    const errors = await validate(testObject);
    assert.strictEqual(errors.length, 1);
    assert.deepStrictEqual(errors[0].constraints, {
      isMapName:
        'value is not a valid map name. It should contain only alphanumeric characters and the _ and - characters'
    });
  });
});
