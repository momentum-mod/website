import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    ignores: ['*.spec.ts'],
    rules: { 'no-console': ['error'] }
  },
  {
    files: ['**/*.spec.ts'],
    rules: { 'no-console': ['off'] }
  }
];
