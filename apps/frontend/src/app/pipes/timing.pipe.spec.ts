import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { TimingPipe } from './timing.pipe';

describe('TimingPipe', () => {
  let pipe: TimingPipe;

  beforeEach(() => {
    pipe = new TimingPipe();
  });

  it('should transform a number to a timing string', () => {
    assert.equal(pipe.transform(1), '1.00');
    assert.equal(pipe.transform(60), '01:00.00');
    assert.equal(pipe.transform(3600), '01:00:00');
    assert.equal(pipe.transform(18.999), '18.99');
    assert.equal(pipe.transform(18.009), '18.00');
    assert.equal(pipe.transform(18.01), '18.01');
  });
});
