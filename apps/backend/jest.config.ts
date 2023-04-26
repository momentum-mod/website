import { JestConfigWithTsJest } from 'ts-jest';

const UnitTestConfig: JestConfigWithTsJest = {
  displayName: 'backend (Unit Tests)',
  preset: '../../jest.preset.js',
  rootDir: '../../',
  roots: ['<rootDir>'],
  setupFilesAfterEnv: [
    '<rootDir>/test/unit/setup.ts',
    '<rootDir>/test/matchers.ts'
  ],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  }
  // testMatch: ['<rootDir>/src/**/*.spec.ts'],
  // modulePaths: [compilerOptions.baseUrl],
  // moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
  //   prefix: '<rootDir>/'
  // })
};

export default UnitTestConfig;

// export default {
//   displayName: 'backend',
//   preset: '../../jest.preset.js',
//   testEnvironment: 'node',
//   transform: {
//     '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
//   },
//   moduleFileExtensions: ['ts', 'js', 'html'],
// };
