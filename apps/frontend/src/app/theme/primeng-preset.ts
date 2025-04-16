import Material from '@primeng/themes/material';
import { definePreset } from '@primeng/themes';

const selectStyles = {
  background: 'rgb(0 0 0 / 0.25)',
  border: {
    color: 'rgb(255 255 255 / 0.1)'
  },
  shadow: 'inset 0 0 0.75rem rgb(0 0 0 / 0.1)',
  padding: {
    x: '1rem',
    y: '.5rem'
  },
  dropdown: {
    width: '2rem'
  },
  focus: {
    border: {
      color: ''
    }
  }
};

export const MomentumPreset = definePreset(Material, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    }
  },
  components: {
    select: {
      ...selectStyles,
      css: () => '.p-select-label { box-shadow: inset 0 0 .75rem #0000001a; }'
    },
    multiselect: {
      ...selectStyles
    },
    inputtext: {
      ...selectStyles
    },
    progressbar: {
      height: '0.5rem',
      border: { radius: '0.25rem' },
      background: 'rgb(var(--pale-800))',
      value: {
        background:
          'linear-gradient(90deg, rgb(var(--blue-500)), rgb(var(--blue-300)))'
      }
    },
    dialog: {
      shadow: '1px 3px 8px rgb(0 0 0 / 0.5)',
      background: '#262626',
      border: {
        color: 'rgb(255 255 255 / 0.05)',
        radius: '0.25rem'
      },
      css: () => '.p-dialog { backdrop-filter: blur(48px); }'
    },
    popover: {
      border: { radius: '0.25rem', color: 'rgb(255 255 255 / 0.05)' },
      content: { padding: '0.75rem' }
    },
    paginator: {
      background: 'rgb(var(--gray-700) / 0.75)',
      padding: '0.25rem 0.75rem',
      border: {
        color: 'rgb(255 255 255 / 0.1)',
        radius: '0.25rem'
      },
      navButton: {
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.6)',
        width: '1.5rem',
        height: '1.5rem',
        borderRadius: '0.25'
      },
      currentPageReport: {
        color: 'rgb(255 255 255 / 0.75)'
      },
      css: () =>
        `.p-paginator { box-shadow: 0 2px 8px rgb(0 0 0 / 0.15), 0 1px 2px rgb(0 0 0 / 0.2); }
        .p-paginator-first,
        .p-paginator-prev,
        .p-paginator-next,
        .p-paginator-last {
          margin: 0.125rem;
          transition: none;
        }`
    },
    tooltip: {
      maxWidth: 'unset',
      css: () => '.p-tooltip-text { word-break: unset; }'
    }
  }
});
