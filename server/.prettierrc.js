module.exports = {
    printWidth: 120,
    trailingComma: 'none',
    tabWidth: 4,
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
        }
    ]
};
