import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from '../../tsconfig.json';
import { InitialOptionsTsJest } from 'ts-jest';

const jestConfig: InitialOptionsTsJest = {
    preset: 'ts-jest',
    rootDir: '../../',
    roots: ['<rootDir>'],
    modulePaths: [compilerOptions.baseUrl],
    testRegex: 'tests/e2e/[^_].+e2e-spec.ts$',
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    globalSetup: '<rootDir>/tests/global-setup.ts',
    setupFilesAfterEnv: ['<rootDir>/tests/matchers.ts'],
    testEnvironment: '<rootDir>/tests/e2e/environment.ts'
};

export default jestConfig;
