import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    files: ['*.ts'],
    rules: { 'no-console': ['error'] }
  },
  {
    files: ['*.spec.ts'],
    rules: { 'no-console': ['off'] }
  }
];
