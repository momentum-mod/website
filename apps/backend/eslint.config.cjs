const baseConfig = require('../../eslint.config.cjs');

module.exports = [
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
