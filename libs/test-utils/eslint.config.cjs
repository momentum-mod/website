const { makeConfig } = require('../../eslint.util.cjs');

module.exports = [
  ...makeConfig(__dirname, '../../tsconfig.base.json'),
  { files: ['*.ts'], rules: { 'unicorn/consistent-function-scoping': ['off'] } }
];
