import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expandToIncludes } from './expand-to-includes';

describe('expandToIncludes', () => {
  type TestInclude = {
    model1: Record<string, unknown>;
    model2: Record<string, unknown>;
  };

  it('should return undefined if expansions is not an array or is empty', () => {
    assert.equal(expandToIncludes(undefined), undefined);
    assert.equal(expandToIncludes(null), undefined);
    assert.equal(expandToIncludes([]), undefined);
  });

  it('should map strings to an object of those strings as keys with values as true', () => {
    assert.deepEqual(expandToIncludes(['a', 'b', 'c']), {
      a: true,
      b: true,
      c: true
    });
  });

  it('should ignore any strings in the options.without array', () => {
    assert.deepEqual(
      expandToIncludes(['a', 'b', 'c'], { without: ['b', 'd'] }),
      {
        a: true,
        c: true
      }
    );
  });

  it('should only maps strings in the options.only array', () => {
    assert.deepEqual(expandToIncludes(['a', 'b', 'c'], { only: ['b', 'c'] }), {
      b: true,
      c: true
    });
  });

  it('should only maps strings in the options.only array without strings in the options.without array', () => {
    assert.deepEqual(
      expandToIncludes(['a', 'b', 'c'], { only: ['b', 'c'], without: ['b'] }),
      {
        c: true
      }
    );
  });

  it('should map expands in the options.mappings arrays', () => {
    assert.deepEqual(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        mappings: [{ expand: 'a', model: 'model1', value: { something: true } }]
      }),
      {
        model1: { something: true },
        b: true
      }
    );

    assert.deepEqual(
      expandToIncludes<TestInclude, string[]>(['model1', 'b'], {
        mappings: [{ expand: 'b', model: 'model1', value: { something: true } }]
      }),
      {
        model1: { something: true }
      }
    );

    assert.deepEqual(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        without: ['b'],
        mappings: [
          { expand: 'a', model: 'model1', value: { something: true } },
          { expand: 'b', model: 'model2', value: { something: true } }
        ]
      }),
      {
        model1: { something: true }
      }
    );

    assert.deepEqual(
      expandToIncludes<TestInclude, string[]>(['a', 'b'], {
        only: ['b'],
        mappings: [
          { expand: 'a', model: 'model1', value: { something: true } },
          { expand: 'b', model: 'model2', value: { something: true } }
        ]
      }),
      {
        model2: { something: true }
      }
    );
  });
});
