const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

const configValues = {
  build: {
    default: {
      target: 'node',
      compiler: 'tsc',
      // Match the removed @nx/webpack:webpack executor: the Dockerfiles run
      // `node main.js`, and production node builds were never minified.
      outputHashing: 'none',
      optimization: false,
      outputPath: '../../dist/apps/discord-bot-internal',
      main: './src/index.ts',
      sourceMap: true,
      tsConfig: './tsconfig.json'
    },
    development: {
      assets: [
        { glob: 'config.json', input: './config', output: './config/' },
        { glob: 'bot_data.db', input: './data', output: './data/' }
      ]
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
