const path = require('node:path');
const { readdirSync } = require('node:fs');

const sourcePath = path.join(__dirname, 'src');
const files = process.env['MOMENTUM_E2E_TEST_FILES']
  ? JSON.parse(process.env['MOMENTUM_E2E_TEST_FILES'])
  : readdirSync(sourcePath)
      .filter((file) => file.endsWith('.e2e-spec.ts'))
      .sort()
      .map((file) => path.join(sourcePath, file));

if (!Array.isArray(files) || files.length === 0) {
  throw new Error(
    'MOMENTUM_E2E_TEST_FILES must contain a non-empty JSON array'
  );
}
process.env['MOMENTUM_E2E_TEST_FILES'] = JSON.stringify(files);

const {
  registerE2ETestRunnerHooks
} = require('./src/support/test-environment.ts');
registerE2ETestRunnerHooks();

// Load every spec into this worker so they share one module cache and app.
for (const file of files) {
  require(file);
}
