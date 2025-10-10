const { composePlugins, withNx } = require('@nx/webpack');
const { sentryWebpackPlugin } = require('@sentry/webpack-plugin');

module.exports = composePlugins(withNx(), (config) => {
  if (process.env['SENTRY_AUTH_TOKEN']) {
    config.plugins.push(
      sentryWebpackPlugin({
        org: process.env['SENTRY_ORG'],
        project: process.env['SENTRY_PROJECT'],
        authToken: process.env['SENTRY_AUTH_TOKEN']
      })
    );
  }

  return config;
});
