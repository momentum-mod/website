import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function runTests(): Promise<void> {
  const sourcePath = path.join(__dirname, 'src');
  const watchMode = process.argv.includes('--watch');
  const env = { ...process.env };
  delete env['MOMENTUM_E2E_TEST_FILES'];
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
      path.join(sourcePath, 'support/e2e-setup.ts'),
      path.join(__dirname, 'test-file-loader.cjs')
    ],
    { stdio: 'inherit', env }
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
