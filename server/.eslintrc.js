const shared = require('../.eslint-shared.js');

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.build.json'],
    sourceType: 'default'
  },
  plugins: shared.plugins,
  extends: shared.extends,
  root: true,
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  ignorePatterns: ['.eslintrc.js', 'node_modules', 'dist'],
  rules: shared.rules,
  overrides: [
    {
      files: ['test/**/*.ts'],
      rules: {
        // These are very useful in tests and don't care about the perf hit.
        'unicorn/consistent-function-scoping': ['off'],
        // Saves const assigments when doing access tokens and it's a big hit to readability.
        'unicorn/no-await-expression-member': ['off']
      }
    }
  ]
};
