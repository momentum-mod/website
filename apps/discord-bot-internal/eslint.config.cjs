const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: { 'no-console': ['error'] }
  },
  {
    files: ['**/src/config.ts', '**/src/types/service.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-declaration-merging': ['off']
    }
  }
];
