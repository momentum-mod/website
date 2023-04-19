module.exports = {
  printWidth: 80,
  trailingComma: 'none',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  bracketSpacing: true,
  overrides: [
    {
      files: '*.json',
      options: {
        singleQuote: false
      }
    },
    {
      files: '*.html',
      options: {
        parser: 'angular'
      }
    }
  ]
};
