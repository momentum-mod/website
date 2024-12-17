import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    files: ['*.ts'],
    rules: { 'unicorn/consistent-function-scoping': ['off'] }
  }
];
