// Shim to allow Webstorm to run all e2e tests -- without this it'll run every
// file in a separate process, which is much slower and may miss bugs in tests
// that don't clean up after themselves.
//
// To use, make a Node Test Runner configuration with:
//    Language: TypeScript
//    Loader: ts-node
//    Node Options: --test-concurrency=1 -r ts-node/register -r tsconfig-paths/register -r reflect-metadata -r ./src/support/e2e-setup.ts
//    Working Directory: <path to your repo root>/website/apps/backend-e2e
//    Environment Variables: TS_NODE_PROJECT=tsconfig.spec.json;TS_NODE_TRANSPILE_ONLY=true
import '../../test-file-loader.cjs';
