const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('node:path');
const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname)
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans],
        display: ['Bebas Neue Momentum', ...defaultTheme.fontFamily.sans]
      },
      flexGrow: {
        2: '2',
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10',
        11: '11',
        12: '12'
      }
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000',
      white: '#fff',
      ...require('./src/app/theme/shared_styling/colors/colors-tailwind-vars')
    }
  },
  corePlugins: {
    preflight: true
  },
  plugins: [
    require('@tailwindcss/typography'),
    plugin(function ({ addBase, theme }) {
      addBase({
        h1: { fontSize: theme('fontSize.6xl') },
        h2: { fontSize: theme('fontSize.4xl') },
        h3: { fontSize: theme('fontSize.3xl') },
        h4: { fontSize: theme('fontSize.2xl') },
        h5: { fontSize: theme('fontSize.xl') },
        h6: { fontSize: theme('fontSize.lg') }
      });
    }),
    plugin(function ({ addVariant }) {
      addVariant('valid', '&.ng-valid.ng-dirty');
      addVariant('invalid', '&.ng-invalid.ng-dirty');
      addVariant('pending', '&.ng-pending.ng-dirty');
      // No FF support for :has yet but probably coming in the next year
      addVariant('validchild', '&:has( .ng-valid.ng-dirty)');
      addVariant('invalidchild', '&:has( .ng-invalid.ng-dirty)');
      addVariant('pendingchild', '&:has( .ng-pending.ng-dirty)');
    })
  ],
  safelist: [
    {
      // We set these dynamically in code in some places, treeshaker doesn't
      // pick them up.
      pattern: /text-(red|green|blue|orange|purple|pink|pale|yellow)/
    }
  ]
};
