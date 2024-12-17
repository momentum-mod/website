import base from '../eslint.config.js';

export default [
  ...base,
  {
    files: ['*.ts'],
    rules: { 'unicorn/no-process-exit': ['off'] }
  }
];
