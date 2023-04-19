import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from '../../tsconfig.json';

const EndToEndTestConfig: JestConfigWithTsJest = {
  displayName: 'E2E Tests',
  preset: 'ts-jest',
  rootDir: '../../',
  roots: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/test/matchers.ts'],
  testTimeout: 5000,
  globalSetup: '<rootDir>/test/e2e/setup.ts',
  testMatch: ['<rootDir>/test/e2e/*.e2e-spec.ts'],
  // E2E tests modify an actual database, so database clean between each tests, tests must be run sequentially.
  maxWorkers: 1,
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  })
};

export default EndToEndTestConfig;
