module.exports = {
  '{apps,libs,tools}/**/*.{js,ts,jsx,tsx,json}': [
    (files) => `nx affected:lint --fix --files=${files.join(',')}`,
    (files) => `nx format:write --files=${files.join(',')}`
  ]
};
