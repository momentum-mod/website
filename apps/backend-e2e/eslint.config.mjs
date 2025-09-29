import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['off'],
      'unicorn/prefer-structured-clone': ['off']
    }
  }
];
