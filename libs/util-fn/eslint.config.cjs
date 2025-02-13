const { makeConfig } = require('../../eslint.util.cjs');

module.exports = [
  ...makeConfig(__dirname, '../../tsconfig.base.json'),
  { ignores: ['**/*.bench.ts'] }
];
