import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from '../../tsconfig.json';

const UnitTestConfig: JestConfigWithTsJest = {
  displayName: 'Unit Tests',
  preset: 'ts-jest',
  rootDir: '../../',
  roots: ['<rootDir>'],
  setupFilesAfterEnv: [
    '<rootDir>/test/unit/setup.ts',
    '<rootDir>/test/matchers.ts'
  ],
  testTimeout: 1000,
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  })
};

export default UnitTestConfig;
