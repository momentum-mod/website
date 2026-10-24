import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deepEquals } from './deep-equal';

describe('deepEquals', () => {
  it('should return true for identical simple values', () => {
    assert.equal(deepEquals(1, 1), true);
    assert.equal(deepEquals('a', 'a'), true);
    assert.equal(deepEquals(true, true), true);
  });

  it('should return false for different simple values', () => {
    assert.equal(deepEquals(1, 2), false);
    assert.equal(deepEquals('a', 'b'), false);
    assert.equal(deepEquals(true, false), false);
  });

  it('should return true for identical arrays', () => {
    assert.equal(deepEquals([1, 2, 3], [1, 2, 3]), true);
  });

  it('should return false for different arrays', () => {
    assert.equal(deepEquals([1, 2, 3], [1, 2, 4]), false);
  });

  it('should return true for identical objects', () => {
    assert.equal(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
  });

  it('should return false for different objects', () => {
    assert.equal(deepEquals({ a: 1, b: 2 }, { a: 1, b: 3 }), false);
  });

  it('should return true for identical Maps', () => {
    const map1 = new Map();
    map1.set('a', 1);
    map1.set('b', 2);

    const map2 = new Map();
    map2.set('a', 1);
    map2.set('b', 2);

    assert.equal(deepEquals(map1, map2), true);
  });

  it('should return false for different Maps', () => {
    const map1 = new Map();
    map1.set('a', 1);
    map1.set('b', 2);

    const map2 = new Map();
    map2.set('a', 1);
    map2.set('b', 3);

    assert.equal(deepEquals(map1, map2), false);
  });

  it('should return true for identical Sets', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);

    assert.equal(deepEquals(set1, set2), true);
  });

  it('should return false for different Sets', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 4]);

    assert.equal(deepEquals(set1, set2), false);
  });

  it('should return true for identical Regular Expressions', () => {
    const regex1 = /abc/gi;
    const regex2 = /abc/gi;

    assert.equal(deepEquals(regex1, regex2), true);
  });

  it('should return false for different Regular Expressions', () => {
    const regex1 = /abc/gi;
    const regex2 = /def/gi;

    assert.equal(deepEquals(regex1, regex2), false);
  });

  it('should return true for NaN values', () => {
    assert.equal(deepEquals(Number.NaN, Number.NaN), true);
  });

  it('should return false for a NaN and a non-NaN value', () => {
    assert.equal(deepEquals(Number.NaN, 1), false);
  });

  it('should return true for identical Date objects', () => {
    const date1 = new Date(2024, 1, 24);
    const date2 = new Date(2024, 1, 24);

    assert.equal(deepEquals(date1, date2), true);
  });

  it('should return false for different Date objects', () => {
    const date1 = new Date(2024, 1, 24);
    const date2 = new Date(2024, 1, 25);

    assert.equal(deepEquals(date1, date2), false);
  });

  it('should return true for identical nested objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 1 } } };

    assert.equal(deepEquals(obj1, obj2), true);
  });

  it('should return false for different nested objects', () => {
    const obj1 = { a: { b: { c: 1 } } };
    const obj2 = { a: { b: { c: 2 } } };

    assert.equal(deepEquals(obj1, obj2), false);
  });

  it('should return true for identical complex nested objects', () => {
    const obj1 = { a: { b: { c: [1, 2, { d: 3 }] } } };
    const obj2 = { a: { b: { c: [1, 2, { d: 3 }] } } };

    assert.equal(deepEquals(obj1, obj2), true);
  });

  it('should return false for different complex nested objects', () => {
    const obj1 = { a: { b: { c: [1, 2, { d: 3 }] } } };
    const obj2 = { a: { b: { c: [1, 2, { d: 4 }] } } };

    assert.equal(deepEquals(obj1, obj2), false);
  });

  it('should return true for identical functions', () => {
    const func = () => {};
    assert.equal(deepEquals(func, func), true);
  });

  it('should return false for different functions', () => {
    const func1 = () => {};
    const func2 = () => {};
    assert.equal(deepEquals(func1, func2), false);
  });
});
