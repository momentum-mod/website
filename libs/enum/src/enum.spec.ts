import { Enum } from './enum';

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
    expect(Enum.length(NumericEnum)).toBe(4);
    expect(Enum.length(StringEnum)).toBe(3);
    expect(Enum.length(HeteroEnum)).toBe(2);
    expect(Enum.length(EmptyEnum)).toBe(0);

    expect(Enum.fastLengthNumeric(NumericEnum)).toBe(4);
    expect(Enum.fastLengthString(StringEnum)).toBe(3);
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
    expect(Enum.keys(NumericEnum)).toEqual(['A', 'B', 'C', 'D']);
    expect(Enum.keys(StringEnum)).toEqual(['A', 'B', 'C']);
    expect(Enum.keys(HeteroEnum)).toEqual(['A', 'B']);
    expect(Enum.keys(EmptyEnum)).toEqual([]);
  });

  it('should return an array of the values of the enum', () => {
    expect(Enum.values(NumericEnum)).toEqual([1, 2, 3, 4]);
    expect(Enum.values(StringEnum)).toEqual(['Apple', 'Banana', 'Cauliflower']);
    expect(Enum.values(HeteroEnum)).toEqual([1, 'DONTUSETHESE']);
  });

  it('should return an empty array for the values of an empty enum', () => {
    expect(Enum.values(EmptyEnum)).toEqual([]);
  });

  it('should return an array of [key, value] tuples for the entries of the enum', () => {
    expect(Enum.entries(NumericEnum)).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 3],
      ['D', 4]
    ]);
    expect(Enum.entries(StringEnum)).toEqual([
      ['A', 'Apple'],
      ['B', 'Banana'],
      ['C', 'Cauliflower']
    ]);
    expect(Enum.entries(HeteroEnum)).toEqual([
      ['A', 1],
      ['B', 'DONTUSETHESE']
    ]);
    expect(Enum.entries(EmptyEnum)).toEqual([]);
  });

  it('should return an iterator for the keys of the enum', () => {
    expect([...Enum.iterKeys(NumericEnum)]).toEqual(['A', 'B', 'C', 'D']);
    expect([...Enum.iterKeys(StringEnum)]).toEqual(['A', 'B', 'C']);
    expect([...Enum.iterKeys(HeteroEnum)]).toEqual(['A', 'B']);
    expect([...Enum.iterKeys(EmptyEnum)]).toEqual([]);

    // Just to check I actually got the construction of the iterator right...
    const result = [];
    for (const key of Enum.iterKeys(NumericEnum)) result.push(key);
    expect(result).toEqual(['A', 'B', 'C', 'D']);
  });
});
