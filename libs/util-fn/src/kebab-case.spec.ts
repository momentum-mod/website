import * as assert from 'node:assert/strict';
import { it } from 'node:test';
import { kebabCase } from './kebab-case';

it('kebabCase', () => {
  assert.equal(kebabCase('helloWorld'), 'hello-world');
  assert.equal(kebabCase('AbcDef'), 'abc-def');
});
