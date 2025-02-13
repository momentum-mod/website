const { makeConfig } = require('../../eslint.util.cjs');

module.exports = [
  ...makeConfig(__dirname, '../../tsconfig.base.json'),
  {
    rules: {
      '@nx/enforce-module-boundaries': ['off'],
      'unicorn/prefer-structured-clone': ['off']
    }
  }
];
