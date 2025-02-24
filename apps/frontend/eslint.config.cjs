const { makeConfig } = require('../../eslint.util.cjs');
const nx = require('@nx/eslint-plugin');

module.exports = [
  ...makeConfig(__dirname, '../../tsconfig.base.json'),
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: ['m']
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['m', 'ngx'],
          style: 'kebab-case'
        }
      ]
      // // Overall project has this disabled, but we want it on for frontend.
      // 'unicorn/prefer-module': ['error']
    }
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/eqeqeq': [
        'error',
        { allowNullOrUndefined: true }
      ],
      '@angular-eslint/template/button-has-type': ['error']
    }
  }
];
