import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    files: ['*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['off'],
      'unicorn/prefer-structured-clone': ['off']
    }
  }
];
