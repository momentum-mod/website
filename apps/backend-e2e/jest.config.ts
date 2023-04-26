export default {
  displayName: 'backend-e2e',
  preset: '../../jest.preset.js',
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  testMatch: ['<rootDir>/src/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/support/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  moduleFileExtensions: ['ts', 'js'],
  // E2E tests modify an actual database, tests must be run sequential
  // to ensure a clean DB.
  maxWorkers: 1
};
