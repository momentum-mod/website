import base from '../../eslint.config.mjs';

export default [
  ...base,
  {
    ignores: ['*.bench.ts']
  }
];
