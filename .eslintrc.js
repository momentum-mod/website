module.exports = {
  root: true,
  ignorePatterns: ['**/*'],
  plugins: ['@nx', 'unicorn', 'unused-imports', 'prettier'],
  overrides: [
    {
      files: ['*.ts', '*.js'],
      rules: {
        '@nx/enforce-module-boundaries': [
          'error',
          {
            enforceBuildableLibDependency: true,
            allow: [],
            depConstraints: [
              {
                sourceTag: '*',
                onlyDependOnLibsWithTags: ['*']
              }
            ]
          }
        ]
      }
    },
    {
      files: ['*.ts'],
      extends: [
        'plugin:@nx/typescript',
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:unicorn/recommended',
        'prettier'
      ],
      parserOptions: {
        project: 'tsconfig.base.json'
      },
      rules: {
        quotes: [
          'error',
          'single',
          {
            avoidEscape: true
          }
        ],
        'no-var': ['error'],
        'prefer-const': ['error'],
        'no-empty': [
          'error',
          {
            allowEmptyCatch: true
          }
        ],
        '@typescript-eslint/no-empty-function': [
          'error',
          {
            allow: ['arrowFunctions']
          }
        ],
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'variable',
            types: ['boolean', 'string', 'number'],
            modifiers: ['global'],
            format: ['UPPER_CASE']
          },
          {
            selector: 'variable',
            types: ['boolean', 'string', 'number'],
            modifiers: ['exported'],
            format: ['strictCamelCase', 'UPPER_CASE']
          },
          {
            selector: 'class',
            format: ['PascalCase']
          },
          {
            selector: 'enumMember',
            format: ['UPPER_CASE']
          },
          {
            selector: 'typeParameter',
            format: ['PascalCase']
          },
          {
            selector: 'interface',
            format: ['PascalCase'],
            custom: {
              regex: '^I[A-Z]',
              match: false
            }
          }
        ],
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
        '@typescript-eslint/no-inferrable-types': [
          'warn',
          { ignoreParameters: true }
        ],
        // Way too sensitive. Most cases it catches are silly, and bad naming is
        // easy to flag in review.
        'unicorn/prevent-abbreviations': ['off'],
        // Not going to make devs use obscure JS syntax for something so minor.
        'unicorn/numeric-separators-style': [
          'warn',
          { onlyIfContainsSeparator: true }
        ],
        // Removing `null` entirely is a noble intention, but reality is that
        // many libraries use it explicitly, especially Prisma. Plus, it's an
        // further thing for new devs to learn about. Better to flag bad uses in
        // review, where the distinction can be explained.
        'unicorn/no-null': ['off'],
        // Backend is still on CJS.
        'unicorn/prefer-module': ['off'],
        // Because of above.
        'unicorn/prefer-top-level-await': ['off'],
        // Even though unicorn has a rule for no nested ternaries, it's
        // insisting I make them due to this rule.
        'unicorn/prefer-ternary': ['error', 'only-single-line'],
        // Better parity with other langauges, we use `1 << 0` frequently next
        // to other shifts when defining bit fields.
        'unicorn/prefer-math-trunc': ['off'],
        // Why???
        'unicorn/switch-case-braces': ['off'],
        // Overly strong, often clearer to handle some error first.
        'unicorn/no-negated-condition': ['off'],
        // Sometimes we want things like `mockResolvedValue(undefined)` in
        // tests. Rule below this handles the actually bad cases.
        'unicorn/no-useless-undefined': ['off'],
        // Some frontend unit tests are like this currently.
        'unicorn/no-empty-file': ['off'],
        'unicorn/prefer-export-from': ['error', { ignoreUsedVariables: true }],
        // Abusable, but fine in some cases. Prefer to handle in review.
        'unicorn/no-array-callback-reference': ['off']
      }
    },
    {
      files: ['*.spec.ts', '*.spec.js', '*.e2e-spec.ts'],
      env: { jest: true },
      rules: {
        // These are very useful in tests and don't care about the perf hit.
        'unicorn/consistent-function-scoping': ['off'],
        // Sometimes we want things like `mockResolvedValue(undefined)` in
        // tests. Rule below this handles the actually bad cases.
        'unicorn/no-useless-undefined': ['off'],
        'no-undef-init': ['error']
      }
    },
    {
      files: ['*.js'],
      extends: ['plugin:@nx/javascript'],
      rules: {}
    }
  ]
};
