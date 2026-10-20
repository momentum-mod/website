import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as Enum from './';

enum NumericEnum {
  A = 1,
  B = 2,
  C = 3,
  D = 4
}

enum StringEnum {
  A = 'Apple',
  B = 'Banana',
  C = 'Cauliflower'
}

enum HeteroEnum {
  A = 1,
  B = 'DONTUSETHESE'
}

enum EmptyEnum {}

describe('Enum', () => {
  it('should return the correct length of the enum', () => {
    assert.equal(Enum.length(NumericEnum), 4);
    assert.equal(Enum.length(StringEnum), 3);
    assert.equal(Enum.length(HeteroEnum), 2);
    assert.equal(Enum.length(EmptyEnum), 0);

    assert.equal(Enum.fastLengthNumeric(NumericEnum), 4);
    assert.equal(Enum.fastLengthString(StringEnum), 3);
  });

  /*
  // Silly benchmarks. Fast versions of each are ~20 times faster.
  it('benchmarks', () => {
    const iters = 1e6;

    console.time('length (numeric)');
    for (let i = 0; i < iters; i++) Enum.length(NumericEnum);
    console.timeEnd('length (numeric)');

    console.time('fastLengthNumeric');
    for (let i = 0; i < iters; i++) Enum.fastLengthNumeric(NumericEnum);
    console.timeEnd('fastLengthNumeric');

    console.time('length (string)');
    for (let i = 0; i < iters; i++) Enum.length(StringEnum);
    console.timeEnd('length (string)');

    console.time('fastLengthString');
    for (let i = 0; i < iters; i++) Enum.fastLengthString(StringEnum);
    console.timeEnd('fastLengthString');

    // These are exactly the same, good job V8
    const bitwise = (obj: object) => Object.keys(obj).length >> 1;
    const nonBitwise = (obj: object) => Object.keys(obj).length / 2;

    console.time('bitwise');
    for (let i = 0; i < iters; i++) bitwise(NumericEnum);
    console.timeEnd('bitwise');

    console.time('nonBitwise');
    for (let i = 0; i < iters; i++) nonBitwise(NumericEnum);
    console.timeEnd('nonBitwise');
  });
  */

  it('should return an array of the keys of the enum', () => {
    assert.deepEqual(Enum.keys(NumericEnum), ['A', 'B', 'C', 'D']);
    assert.deepEqual(Enum.keys(StringEnum), ['A', 'B', 'C']);
    assert.deepEqual(Enum.keys(HeteroEnum), ['A', 'B']);
    assert.deepEqual(Enum.keys(EmptyEnum), []);
    assert.deepEqual(Enum.fastKeysNumeric(NumericEnum), ['A', 'B', 'C', 'D']);
    assert.deepEqual(Enum.fastKeysString(StringEnum), ['A', 'B', 'C']);

    enum NaNTest {
      A,

      NaN
    }
    assert.deepEqual(Enum.keys(NaNTest), ['A', 'NaN']);
  });

  it('should return an array of the values of the enum', () => {
    assert.deepEqual(Enum.values(NumericEnum), [1, 2, 3, 4]);
    assert.deepEqual(Enum.values(StringEnum), [
      'Apple',
      'Banana',
      'Cauliflower'
    ]);
    assert.deepEqual(Enum.values(HeteroEnum), [1, 'DONTUSETHESE']);

    assert.deepEqual(Enum.fastValuesNumeric(NumericEnum), [1, 2, 3, 4]);
    assert.deepEqual(Enum.fastValuesString(StringEnum), [
      'Apple',
      'Banana',
      'Cauliflower'
    ]);
  });

  it('should return an empty array for the values of an empty enum', () => {
    assert.deepEqual(Enum.values(EmptyEnum), []);
  });

  it('should return an array of [key, value] tuples for the entries of the enum', () => {
    assert.deepEqual(Enum.entries(NumericEnum), [
      ['A', 1],
      ['B', 2],
      ['C', 3],
      ['D', 4]
    ]);
    assert.deepEqual(Enum.entries(StringEnum), [
      ['A', 'Apple'],
      ['B', 'Banana'],
      ['C', 'Cauliflower']
    ]);
    assert.deepEqual(Enum.entries(HeteroEnum), [
      ['A', 1],
      ['B', 'DONTUSETHESE']
    ]);
    assert.deepEqual(Enum.entries(EmptyEnum), []);

    assert.deepEqual(Enum.fastEntriesNumeric(NumericEnum), [
      ['A', 1],
      ['B', 2],
      ['C', 3],
      ['D', 4]
    ]);

    assert.deepEqual(Enum.fastEntriesString(StringEnum), [
      ['A', 'Apple'],
      ['B', 'Banana'],
      ['C', 'Cauliflower']
    ]);
  });
});
