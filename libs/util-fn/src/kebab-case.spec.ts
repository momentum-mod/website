import { kebabCase } from './kebab-case';

it('kebabCase', () => {
  expect(kebabCase('helloWorld')).toBe('hello-world');
  expect(kebabCase('AbcDef')).toBe('abc-def');
});
