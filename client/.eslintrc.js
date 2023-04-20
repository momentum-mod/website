const shared = require('../.eslint-shared.js');

module.exports = {
  parser: '@typescript-eslint/parser',

  root: true,
  env: {
    'shared-node-browser': true,
    es6: true
  },
  ignorePatterns: ['.eslintrc.js', 'node_modules', 'dist'],
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['tsconfig.json', 'e2e/tsconfig.e2e.json'],
        ecmaVersion: 'latest'
      },
      plugins: shared.plugins,
      extends: [
        ...shared.extends,
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates'
      ],
      rules: shared.rules
    },
    {
      files: ['*.html'],
      extends: [
        'plugin:@angular-eslint/template/recommended',
        'plugin:prettier/recommended'
      ],
      rules: {}
    }
  ]
};
