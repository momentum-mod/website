import baseConfig from '../../eslint.config.mjs';

export default [...baseConfig, { ignores: ['libs/db/src/generated/**'] }];
