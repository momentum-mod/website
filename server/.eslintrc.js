module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module'
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'unicorn', 'unused-imports', 'prettier'],
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:unicorn/recommended', 'prettier'],
    root: true,
    env: {
        node: true,
        jest: true,
        es2022: true
    },
    ignorePatterns: ['.eslintrc.js', 'node_modules', '_*.ts', 'dist', '**/*.d.ts'],
    rules: {
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                args: 'after-used',
                varsIgnorePattern: '^_',
                argsIgnorePattern: '^_'
            }
        ],
        '@typescript-eslint/no-inferrable-types': ['warn', { ignoreParameters: true }],
        // Way too sensitive. Most cases it catches are silly, and bad naming is easy to flag in review.
        'unicorn/prevent-abbreviations': ['off'],
        // Not going to make devs use obscure JS syntax for something so minor.
        'unicorn/numeric-separators-style': ['warn', { onlyIfContainsSeparator: true }],
        // Removing `null` entirely is a noble intention, but reality is that many libraries use it explicitly,
        // especially Prisma. Plus, it's an further obscure thing for new devs to learn about. Better to flag bad uses
        // in review, where the distinction can be explained.
        'unicorn/no-null': ['off'],
        // We're still on CJS for now, not bothering with path aliasing on ES modules yet. Can remove if we switch to ES.
        'unicorn/prefer-module': ['off'],
        // Same as above.
        'unicorn/prefer-top-level-await': ['off'],
        // Even though unicorn has a rule for no nested ternaries, it's insisting I make them due to this rule.
        'unicorn/prefer-ternary': ['error', 'only-single-line'],
        // Better parity with other langauges, we use `1 << 0` frequently next to other shifts when defining bitflags.
        'unicorn/prefer-math-trunc': ['off'],
        // Why???
        'unicorn/switch-case-braces': ['off']
    },
    overrides: [
        {
            files: ['tests/**/*.ts'],
            rules: {
                // These are very useful in tests and don't care about the perf hit.
                'unicorn/consistent-function-scoping': ['off'],
                // Saves const assigments when doing access tokens and it's a big hit to readability.
                'unicorn/no-await-expression-member': ['off']
            }
        }
    ]
};
