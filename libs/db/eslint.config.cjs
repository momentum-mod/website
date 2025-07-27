const baseConfig = require('../../eslint.config.cjs');

module.exports = [...baseConfig, { ignores: ['libs/db/src/generated/**'] }];
