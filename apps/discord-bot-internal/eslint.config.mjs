import baseConfig from '../../eslint.config.mjs';

export default [
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
