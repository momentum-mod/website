import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
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
      '@angular-eslint/template/button-has-type': ['error'],
      // Disable some accessibility rules.
      // TODO: We really need to do a pass of this in the future, maybe when
      // we do mobile.
      '@angular-eslint/template/interactive-supports-focus': ['off'],
      '@angular-eslint/template/click-events-have-key-events': ['off'],
      '@angular-eslint/template/alt-text': ['off'],
      '@angular-eslint/template/label-has-associated-control': ['off']
    }
  }
];
