const baseConfig = require('./eslint.config.cjs');
const path = require('node:path');

module.exports = {
  makeConfig(dirname, tsConfig) {
    for (const block of baseConfig) {
      const parserOptions = block.languageOptions?.parserOptions;
      if (parserOptions) {
        parserOptions.project = path.join(dirname, tsConfig);
      }
    }

    return baseConfig;
  }
};
