import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    ignores: ['*.test.ts'],
    rules: { 'no-console': ['error'] }
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'no-console': ['off'] }
  }
];
