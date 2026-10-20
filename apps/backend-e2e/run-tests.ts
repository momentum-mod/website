import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import globalSetup from './src/support/global-setup';

async function runTests(): Promise<void> {
  await globalSetup();

  const sourcePath = path.join(__dirname, 'src');
  const testFiles = readdirSync(sourcePath)
    .filter((file) => file.endsWith('.e2e-spec.ts'))
    .sort()
    .map((file) => path.join(sourcePath, file));
  if (testFiles.length === 0) {
    throw new Error(`No E2E test files found in ${sourcePath}`);
  }

  const watchMode = process.argv.includes('--watch');
  const result = spawnSync(
    process.execPath,
    [
      '--test',
      ...(watchMode ? ['--watch'] : []),
      '--test-concurrency=1',
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      '-r',
      'reflect-metadata',
      '-r',
      path.join(sourcePath, 'support/test-setup.ts'),
      ...testFiles
    ],
    { stdio: 'inherit', env: process.env }
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (require.main === module) {
  void runTests().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
