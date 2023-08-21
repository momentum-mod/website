import { isEmpty, throwIfEmpty, undefinedIfEmpty } from './is-empty';

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

describe('throwIfEmpty', () => {
  test('should throw BadRequestException if object is empty', () => {
    expect(() => throwIfEmpty({})).toThrow();
  });

  test('should not throw BadRequestException if object is not empty', () => {
    expect(() => throwIfEmpty(testObj)).not.toThrow();
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
