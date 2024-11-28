const { makeConfig } = require('../../eslint.util.cjs');

module.exports = [
  ...makeConfig(__dirname, 'tsconfig.app.json'),
  {
    files: ['*.ts'],
    ignores: ['*.spec.ts'],
    rules: { 'no-console': ['error'] }
  },
  {
    files: ['*.spec.ts'],
    rules: { 'no-console': ['off'] }
  }
];
