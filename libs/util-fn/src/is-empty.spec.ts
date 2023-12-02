import { isEmpty, undefinedIfEmpty } from './is-empty';

const testObj = { a: 1 };

describe('isEmpty', () => {
  test('should return true if object is empty or undefined', () => {
    expect(isEmpty({})).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  test('should return false if object is not empty', () => {
    expect(isEmpty(testObj)).toBe(false);
  });
});

describe('undefinedIfEmpty', () => {
  test('should return undefined if object is empty', () => {
    expect(undefinedIfEmpty({})).toBeUndefined();
  });

  test('should return the object if it is not empty', () => {
    expect(undefinedIfEmpty(testObj)).toBe(testObj);
  });
});
