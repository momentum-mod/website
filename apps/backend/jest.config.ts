export default {
  displayName: 'backend',
  preset: '../../jest.preset.js',
  roots: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/test/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }]
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)']
};
