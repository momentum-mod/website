import { expandToIncludes } from './expand-to-includes';

describe('expandToIncludes', () => {
  type TestInclude = {
    model1: Record<string, unknown>;
    model2: Record<string, unknown>;
  };

  it('should return undefined if expansions is not an array or is empty', () => {
    expect(expandToIncludes(undefined)).toBeUndefined();
    expect(expandToIncludes(null)).toBeUndefined();
    expect(expandToIncludes([])).toBeUndefined();
  });

  it('should map strings to an object of those strings as keys with values as true', () => {
    expect(expandToIncludes(['a', 'b', 'c'])).toEqual({
      a: true,
      b: true,
      c: true
    });
  });

  it('should ignore any strings in the options.without array', () => {
    expect(expandToIncludes(['a', 'b', 'c'], { without: ['b', 'd'] })).toEqual({
      a: true,
      c: true
    });
  });

  it('should only maps strings in the options.only array', () => {
    expect(expandToIncludes(['a', 'b', 'c'], { only: ['b', 'c'] })).toEqual({
      b: true,
      c: true
    });
  });

  it('should only maps strings in the options.only array without strings in the options.without array', () => {
    expect(
      expandToIncludes(['a', 'b', 'c'], { only: ['b', 'c'], without: ['b'] })
    ).toEqual({
      c: true
    });
  });

  it('should map expands in the options.mappings arrays', () => {
    expect(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        mappings: [{ expand: 'a', model: 'model1', value: { something: true } }]
      })
    ).toEqual({
      model1: { something: true },
      b: true
    });

    expect(
      expandToIncludes<TestInclude, string[]>(['model1', 'b'], {
        mappings: [{ expand: 'b', model: 'model1', value: { something: true } }]
      })
    ).toEqual({
      model1: { something: true }
    });

    expect(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        without: ['b'],
        mappings: [
          { expand: 'a', model: 'model1', value: { something: true } },
          { expand: 'b', model: 'model2', value: { something: true } }
        ]
      })
    ).toEqual({
      model1: { something: true }
    });

    expect(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        only: ['b'],
        mappings: [
          { expand: 'a', model: 'model1', value: { something: true } },
          { expand: 'b', model: 'model2', value: { something: true } }
        ]
      })
    ).toEqual({
      model2: { something: true }
    });
  });
});
