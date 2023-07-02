module.exports = {
  extends: ['../../.eslintrc.js'],
  ignorePatterns: ['!**/*', '**.*spec.ts'],
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@angular-eslint/directive-selector': [
          'error',
          {
            type: ['element', 'attribute'],
            prefix: ['mom', 'nb']
          }
        ],
        '@angular-eslint/component-selector': [
          'error',
          {
            type: 'element',
            prefix: ['mom', 'ngx'],
            style: 'kebab-case'
          }
        ],
        // Overall project has this disabled, but we want it on for frontend.
        'unicorn/prefer-module': ['error'],
        // Messing with @angular/core's EventEmitter:
        // https://github.com/sindresorhus/eslint-plugin-unicorn/issues/1853
        'unicorn/prefer-event-target': ['off']
      },
      extends: [
        'plugin:@nx/angular',
        'plugin:@angular-eslint/template/process-inline-templates'
      ],
      parserOptions: {
        project: 'tsconfig.base.json'
      }
    },
    {
      files: ['*.html'],
      extends: ['plugin:@nx/angular-template'],
      rules: {}
    }
  ]
};
