import base from '../../eslint.config.mjs';
import angularTemplate from '@angular-eslint/eslint-plugin-template';

export default [
  ...base,
  {
    files: ['*.ts'],
    extends: [angularTemplate.configs['process-inline-templates']],
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
      ],
      // Overall project has this disabled, but we want it on for frontend.
      'unicorn/prefer-module': ['error'],
      // Messing with @angular/core's EventEmitter:
      // https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1853
      'unicorn/prefer-event-target': ['off']
    }
  },
  {
    files: ['*.html'],
    extends: ['plugin:@nx/angular-template'],
    rules: {
      '@angular-eslint/template/eqeqeq': [
        'error',
        { allowNullOrUndefined: true }
      ],
      '@angular-eslint/template/button-has-type': ['error']
    }
  }
];
