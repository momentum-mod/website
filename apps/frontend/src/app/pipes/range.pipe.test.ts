import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { RangePipe } from './range.pipe';

describe('RangePipe', () => {
  let pipe: RangePipe;

  beforeEach(() => {
    pipe = new RangePipe();
  });

  it('should create an instance', () => {
    assert.ok(pipe);
  });

  it('should return [0] when start is 1 and stop is undefined', () => {
    assert.deepEqual(pipe.transform(1), [0]);
  });

  it('should return [0, 1, 2] when start is 0 and stop is 3', () => {
    assert.deepEqual(pipe.transform(0, 3), [0, 1, 2]);
  });

  it('should return [2, 3] when start is 2 and stop is 4', () => {
    assert.deepEqual(pipe.transform(2, 4), [2, 3]);
  });
});
