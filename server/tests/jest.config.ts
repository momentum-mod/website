import { JestConfigWithTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from '../tsconfig.json';

const jestConfig: JestConfigWithTsJest = {
    preset: 'ts-jest',
    rootDir: '../',
    roots: ['<rootDir>'],
    modulePaths: [compilerOptions.baseUrl],
    testRegex: ['.*spec.ts'],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    globalSetup: '<rootDir>/tests/global-setup.ts',
    setupFilesAfterEnv: ['<rootDir>/tests/matchers.ts'],
    testTimeout: 10000
};

export default jestConfig;
