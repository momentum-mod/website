const baseConfig = require('../../eslint.config.cjs');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['off'],
      'unicorn/prefer-structured-clone': ['off']
    }
  }
];
