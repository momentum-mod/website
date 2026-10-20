import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { UnsortedKeyvaluePipe } from './unsorted-keyvalue.pipe';
import { ɵdefaultKeyValueDiffers as defaultKeyValueDiffers } from '@angular/core';

describe('UnsortedKeyvaluePipe', () => {
  let pipe: UnsortedKeyvaluePipe;

  beforeEach(() => {
    pipe = new UnsortedKeyvaluePipe(defaultKeyValueDiffers);
  });

  it('should create an instance', () => {
    assert.ok(pipe);
  });

  it('should return the same order of keys as the input object', () => {
    const input = { c: 1, a: 2, b: 3 };
    const result = pipe.transform(input);
    assert.deepEqual(result, [
      { key: 'c', value: 1 },
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ]);
  });
});
