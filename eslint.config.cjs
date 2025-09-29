const nx = require('@nx/eslint-plugin');
const unicorn = require('eslint-plugin-unicorn');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  { ignores: ['**/*.cjs', '**/dist'] },
  {
    files: ['**/*.ts'],
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-var': ['error'],
      'prefer-const': ['error'],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'smart'],
      '@typescript-eslint/no-empty-function': [
        'error',
        {
          // Arrow functions: () => {} is identical to () => void 0, but
          // easier to understand.
          // Ctors: Private empty ctors are often useful for classes with
          // async static method to create instances that want to mark their
          // ctor as private.
          allow: ['arrowFunctions', 'constructors']
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off', // unused-imports handles this
      '@typescript-eslint/no-inferrable-types': [
        'warn',
        { ignoreParameters: true }
      ],
      // TypeScript's type narrowing isn't infallible, quite common to have
      // cases of this, I don't find the warning helpful, better to bring
      // up in review.
      '@typescript-eslint/no-non-null-assertion': ['off'],
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'frontend',
              bannedExternalImports: [
                '@nestjs/common',
                '@prisma/client',
                '@momentum/db'
              ]
            },
            {
              sourceTag: 'backend',
              bannedExternalImports: ['@angular/core']
            },
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*']
            }
          ]
        }
      ]
    }
  },
  // Unused imports
  {
    plugins: { 'unused-imports': unusedImports },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_'
        }
      ]
    }
  },
  // Unicorn. Recommended config has too much dumb stuff.
  {
    languageOptions: { globals: globals.builtin },
    plugins: { unicorn },
    rules: {
      'unicorn/consistent-destructuring': 'error',
      'unicorn/consistent-empty-array-spread': 'error',
      'unicorn/consistent-existence-index-check': 'error',
      'unicorn/error-message': 'error',
      'unicorn/expiring-todo-comments': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/no-length-as-slice-end': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-new-buffer': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-unreadable-array-destructuring': 'error',
      'unicorn/no-useless-length-check': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-set-size': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/throw-new-error': 'error'
    }
  },
  // Test-specific
  {
    files: ['**/*.spec.ts', '**/*.spec.js', '**/*.e2e-spec.ts'],
    rules: {
      // Sometimes we want things like `mockResolvedValue(undefined)` in
      // tests. Rule below this handles the actually bad cases.
      'unicorn/no-useless-undefined': ['off'],
      'no-undef-init': ['error'],
      eqeqeq: ['off']
    }
  }
];
