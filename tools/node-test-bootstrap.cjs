'use strict';

const { existsSync } = require('node:fs');
const path = require('node:path');
const { isMainThread } = require('node:worker_threads');

// Script to bootstrap into the appropriate test environment in a IDE's test
// runner (currently just tested with WebStorm).
//
// Determines whether we're a unit or an E2E test and sets up the appropriate
// environment.
//
// To configure in WebStorm, in the default Run/Debug configurations for
// Node Test Runner, and set:
//		Language: TypeScript
// 		Loader: ts-node
// 		Node Options: --test -r ./tools/node-test-bootstrap.cjs
// 		Working Directory: <path to your repo root>
//
// To configure a runner for *all* backend-e2e, create a specific
// Node Test Runner configuration with:
//    Language: TypeScript
//    Loader: ts-node
//    Node Options: --test-concurrency=1 -r ts-node/register -r tsconfig-paths/register -r reflect-metadata -r ./src/support/e2e-setup.ts
//    Working Directory: <path to your repo root>
//    Environment Variables: TS_NODE_PROJECT=tsconfig.spec.json;TS_NODE_TRANSPILE_ONLY=true

const workspaceRoot = path.resolve(__dirname, '..');
const testFiles = process.argv
  .slice(1)
  .filter((argument) => /\.test\.ts$/i.test(argument))
  .map((argument) => path.resolve(process.cwd(), argument))
  .filter(existsSync);

if (testFiles.length === 0) {
  // Worker threads inherit --require options but not the test-file argument.
  if (isMainThread) {
    throw new Error(
      'Could not find a .test.ts test target in the Node arguments.'
    );
  }
} else {
  const specConfigs = [...new Set(testFiles.map(findSpecConfig))];
  if (specConfigs.length !== 1) {
    throw new Error(
      'The test bootstrap can run tests from only one Nx project at a time.'
    );
  }

  const relativeTestPath = path
    .relative(workspaceRoot, testFiles[0])
    .split(path.sep)
    .join('/');
  const isBackend = relativeTestPath.startsWith('apps/backend/');
  const isBackendE2E = relativeTestPath.startsWith('apps/backend-e2e/');
  const isFrontend = relativeTestPath.startsWith('apps/frontend/');

  process.env.TS_NODE_PROJECT = specConfigs[0];
  if (isBackendE2E) {
    process.env.TS_NODE_TRANSPILE_ONLY = 'true';
  } else {
    delete process.env.TS_NODE_TRANSPILE_ONLY;
  }

  require('ts-node/register');
  require('tsconfig-paths/register');

  if (isBackend || isBackendE2E) {
    require('reflect-metadata');
  }

  if (isBackend) {
    require(path.join(workspaceRoot, 'apps/backend/test/test-setup.ts'));
  } else if (isBackendE2E) {
    require(
      path.join(workspaceRoot, 'apps/backend-e2e/src/support/e2e-setup.ts')
    );
  } else if (isFrontend) {
    require(path.join(workspaceRoot, 'apps/frontend/src/test-setup.ts'));
  }
}

function findSpecConfig(testFile) {
  let directory = path.dirname(testFile);

  while (
    directory === workspaceRoot ||
    directory.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    const configPath = path.join(directory, 'tsconfig.spec.json');
    if (existsSync(configPath)) return configPath;
    if (directory === workspaceRoot) break;
    directory = path.dirname(directory);
  }

  throw new Error(`No tsconfig.spec.json found for ${testFile}`);
}
