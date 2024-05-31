module.exports = {
  '{apps,libs,tools}/**/*.{js,ts,json,html,md}': [
    // Disabling ESLint commithook, too goddamn slow!
    // (files) => `nx affected:lint --fix --files=${files.join(',')}`,
    (files) => `nx format:write --files=${files.join(',')}`
  ]
};
