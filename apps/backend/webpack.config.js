const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

const configValues = {
  build: {
    default: {
      target: 'node',
      compiler: 'tsc',
      outputHashing: 'none',
      optimization: false,
      outputPath: '../../dist/apps/backend',
      main: './src/main.ts',
      sourceMap: true,
      tsConfig: './tsconfig.app.json'
    },
    production: { generatePackageJson: true }
  }
};

// Determine the correct configValue to use based on the configuration
const configuration = process.env.NX_TASK_TARGET_CONFIGURATION || 'default';

const buildOptions = {
  ...configValues.build.default,
  ...configValues.build[configuration]
};

/**
 * @type{import('webpack').Configuration}
 */
module.exports = {
  plugins: [
    new NxAppWebpackPlugin(buildOptions),
    // Upload source maps to Sentry when credentials are available (CI).
    ...(process.env['SENTRY_AUTH_TOKEN']
      ? [
          sentryWebpackPlugin({
            org: process.env['SENTRY_ORG'],
            project: process.env['SENTRY_PROJECT'],
            authToken: process.env['SENTRY_AUTH_TOKEN']
          })
        ]
      : [])
  ]
};
