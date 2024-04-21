module.exports = {
  '{apps,libs,tools}/**/*.{js,ts,jsx,tsx,json}': [
    // Disabling ESLint commithook, too goddamn slow!
    // (files) => `nx affected:lint --fix --files=${files.join(',')}`,
    (files) => `nx format:write --files=${files.join(',')}`
  ]
};
