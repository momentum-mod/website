import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractPrefixFromMapName } from './extract-prefix-from-map-name';

describe('extractPrefixFromMapName', () => {
  it('should return a tuple of name and prefix if given a name with a prefix', () => {
    assert.deepEqual(extractPrefixFromMapName('surf_my_cool_map'), [
      'my_cool_map',
      'surf'
    ]);
  });

  it('should return a tuple of base name and null if given a name without prefix', () => {
    assert.deepEqual(extractPrefixFromMapName('my_cool_map_2'), [
      'my_cool_map_2',
      null
    ]);
  });
});
