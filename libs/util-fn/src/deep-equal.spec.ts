import { deepEquals } from './deep-equal';

describe('deepEquals', () => {
  it('should return true for identical simple values', () => {
    expect(deepEquals(1, 1)).toBe(true);
    expect(deepEquals('a', 'a')).toBe(true);
    expect(deepEquals(true, true)).toBe(true);
  });

  it('should return false for different simple values', () => {
    expect(deepEquals(1, 2)).toBe(false);
    expect(deepEquals('a', 'b')).toBe(false);
    expect(deepEquals(true, false)).toBe(false);
  });

  it('should return true for identical arrays', () => {
    expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('should return false for different arrays', () => {
    expect(deepEquals([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it('should return true for identical objects', () => {
    expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it('should return true for identical Maps', () => {
    const map1 = new Map();
    map1.set('a', 1);
    map1.set('b', 2);

    const map2 = new Map();
    map2.set('a', 1);
    map2.set('b', 2);

    expect(deepEquals(map1, map2)).toBe(true);
  });

  it('should return false for different Maps', () => {
    const map1 = new Map();
    map1.set('a', 1);
    map1.set('b', 2);

    const map2 = new Map();
    map2.set('a', 1);
    map2.set('b', 3);

    expect(deepEquals(map1, map2)).toBe(false);
  });

  it('should return true for identical Sets', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);

    expect(deepEquals(set1, set2)).toBe(true);
  });

  it('should return false for different Sets', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 4]);

    expect(deepEquals(set1, set2)).toBe(false);
  });

  it('should return true for identical Regular Expressions', () => {
    const regex1 = /abc/gi;
    const regex2 = /abc/gi;

    expect(deepEquals(regex1, regex2)).toBe(true);
  });

  it('should return false for different Regular Expressions', () => {
    const regex1 = /abc/gi;
    const regex2 = /def/gi;

    expect(deepEquals(regex1, regex2)).toBe(false);
  });

  it('should return true for NaN values', () => {
    expect(deepEquals(Number.NaN, Number.NaN)).toBe(true);
  });

  it('should return false for a NaN and a non-NaN value', () => {
    expect(deepEquals(Number.NaN, 1)).toBe(false);
  });

  it('should return true for identical Date objects', () => {
    const date1 = new Date(2024, 1, 24);
    const date2 = new Date(2024, 1, 24);

    expect(deepEquals(date1, date2)).toBe(true);
  });

  it('should return false for different Date objects', () => {
    const date1 = new Date(2024, 1, 24);
    const date2 = new Date(2024, 1, 25);

    expect(deepEquals(date1, date2)).toBe(false);
  });

  it('should return true for identical nested objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 1 } } };

    expect(deepEquals(obj1, obj2)).toBe(true);
  });

  it('should return false for different nested objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 2 } } };

    expect(deepEquals(obj1, obj2)).toBe(false);
  });

  it('should return true for identical complex nested objects', () => {
    const obj1 = { a: { b: { c: [1, 2, { d: 3 }] } } };
    const obj2 = { a: { b: { c: [1, 2, { d: 3 }] } } };

    expect(deepEquals(obj1, obj2)).toBe(true);
  });

  it('should return false for different complex nested objects', () => {
    const obj1 = { a: { b: { c: [1, 2, { d: 3 }] } } };
    const obj2 = { a: { b: { c: [1, 2, { d: 4 }] } } };

    expect(deepEquals(obj1, obj2)).toBe(false);
  });

  it('should return true for identical functions', () => {
    const func = () => {};
    expect(deepEquals(func, func)).toBe(true);
  });

  it('should return false for different functions', () => {
    const func1 = () => {};
    const func2 = () => {};
    expect(deepEquals(func1, func2)).toBe(false);
  });
});
