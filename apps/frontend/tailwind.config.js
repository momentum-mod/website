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
    screens: {
      // Default Tailwind is
      //   'sm': '640px',
      //   'md': '768px',
      //   'lg': '1024px',
      //   'xl': '1280px'
      // but we don't care about small variations in tablet sizes that much
      sm: '640px',
      md: '768px',
      lg: '1280px',
      xl: '1536px'
    },
    extend: {
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans],
        display: ['Bebas Neue Momentum', ...defaultTheme.fontFamily.sans]
      },
      // Relativized versions of font-size: 8pt, 9pt, 10pt etc...
      fontSize: {
        8: '0.5rem',
        9: '0.5625rem',
        10: '0.625rem',
        11: '0.6875rem',
        12: '0.75rem',
        14: '0.875rem',
        16: '1rem',
        18: '1.125rem',
        20: '1.25rem',
        22: '1.375rem',
        24: '1.5rem',
        26: '1.625rem',
        28: '1.75rem',
        30: '1.875rem',
        32: '2rem',
        36: '2.25rem',
        40: '2.5rem',
        44: '2.75rem',
        48: '3rem',
        56: '3.5rem',
        64: '4rem'
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
      },
      flexBasis: {
        '1/10': '10%',
        '2/10': '20%',
        '3/10': '30%',
        '4/10': '40%',
        '5/10': '50%',
        '6/10': '60%',
        '7/10': '70%',
        '8/10': '80%',
        '9/10': '90%',
        '10/10': '100%',
        '1/20': '5%',
        '2/20': '10%',
        '3/20': '15%',
        '4/20': '20%',
        '5/20': '25%',
        '6/20': '30%',
        '7/20': '35%',
        '8/20': '40%',
        '9/20': '45%',
        '10/20': '50%',
        '11/20': '55%',
        '12/20': '60%',
        '13/20': '65%',
        '14/20': '70%',
        '15/20': '75%',
        '16/20': '80%',
        '17/20': '85%',
        '18/20': '90%',
        '19/20': '95%',
        '20/20': '100%'
      }
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000',
      white: '#fff',
      ...require('./src/app/theme/shared_styling/colors/colors-tailwind-vars')
    },
    // Tailwind's shadows are super weak, these are based off of them but
    // with increased strength.
    // https://tailwindcss.com/docs/box-shadow
    // prettier-ignore
    boxShadow: ((strength) => ({
      sm: `0 1px 2px 0 rgb(0 0 0 / ${strength * 0.5})`,
      DEFAULT: `0 1px 3px 0 rgb(0 0 0 / ${strength}), 0 1px 2px -1px rgb(0 0 0 / ${strength})`,
      md: `0 1px 3px 0 rgb(0 0 0 / ${strength}), 0 1px 2px -1px rgb(0 0 0 / ${strength})`,
      lg: `0 10px 15px -3px rgb(0 0 0 / ${strength}), 0 4px 6px -4px rgb(0 0 0 / ${strength})`,
      xl: `0 20px 25px -5px rgb(0 0 0 / ${strength}), 0 8px 10px -6px rgb(0 0 0 / ${strength})`,
      '2xl': `0 25px 50px -12px rgb(0 0 0 / ${strength * 2})`,
      inner: `inset 0 0 12px 0 rgb(0 0 0 / ${strength * 0.5})`
    }))(0.25),
    // Same as above.
    // https://tailwindcss.com/docs/drop-shadow
    // prettier-ignore
    dropShadow: ((strength) => ({
      sm: `0 1px 1px rgb(0 0 0 / ${strength * 0.5})`,
      DEFAULT: [`0 1px 2px rgb(0 0 0 / ${strength})`,`0 1px 1px rgb(0 0 0 / ${strength * 0.6})`],
      md: [`0 4px 3px rgb(0 0 0 / ${strength * 0.7})`, `0 2px 2px rgb(0 0 0 / ${strength * 0.6})`],
      lg: [`0 10px 8px rgb(0 0 0 / ${strength * 0.4})`, `0 4px 3px rgb(0 0 0 / ${strength})`],
      xl: [`0 20px 13px rgb(0 0 0 / ${strength * 0.3})`, `0 8px 5px rgb(0 0 0 / ${strength * 0.8})`],
      '2xl': `0 25px 25px rgb(0 0 0 / ${strength * 1.5})`,
    }))(0.325)
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
