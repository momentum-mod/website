module.exports = {
  extends: ['../../.eslintrc.js'],
  ignorePatterns: ['!**/*'],
  overrides: [
    {
      files: ['*.ts'],
      // Backend should never use this - use the injected logger.
      rules: { 'no-console': ['error'] }
    },
    {
      files: ['*.spec.ts'],
      rules: { 'no-console': ['off'] }
    }
  ]
};
