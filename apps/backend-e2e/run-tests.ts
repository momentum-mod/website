import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sourcePath = path.join(__dirname, 'src');

// Valkey has 16 logical databases by default, one per worker.
const MAX_WORKERS = 16;
const DEFAULT_MAX_WORKERS = 4;

function getTestArgs(watchMode: boolean): string[] {
  return [
    '--test',
    '--test-reporter=spec',
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
  ];
}

function getTestFiles(): string[] {
  return readdirSync(sourcePath)
    .filter((file) => file.endsWith('.test.ts'))
    .sort()
    .map((file) => path.join(sourcePath, file));
}

function getWorkerCount(fileCount: number): number {
  const setting = process.env['MOMENTUM_E2E_WORKERS'];
  const requested = Number.parseInt(setting, 10);
  // Be considerate by default, this is usually someone's dev machine. `max` is
  // for CI, where the whole machine is ours: a worker per CPU, no memory limit.
  const count =
    setting === 'max'
      ? availableParallelism()
      : Number.isNaN(requested)
        ? Math.min(
            DEFAULT_MAX_WORKERS,
            Math.max(1, Math.floor(availableParallelism() / 2))
          )
        : requested;
  return Math.max(1, Math.min(count, MAX_WORKERS, fileCount));
}

/**
 * Spread files over `count` groups so each has roughly the same amount of
 * test code, largest first. File size is a decent proxy for run time.
 */
function partitionFiles(files: string[], count: number): string[][] {
  const groups = Array.from({ length: count }, () => ({
    files: [] as string[],
    size: 0
  }));
  const bySize = files
    .map((file) => ({ file, size: statSync(file).size }))
    .sort((a, b) => b.size - a.size);

  for (const { file, size } of bySize) {
    const smallest = groups.reduce((a, b) => (b.size < a.size ? b : a));
    smallest.files.push(file);
    smallest.size += size;
  }

  return groups.map((group) => group.files.sort());
}

/**
 * Everything a worker shares with the others needs its own copy: the in-memory
 * Postgres is already per-process, the rest (Valkey, S3) is separated here.
 */
function getWorkerEnv(
  index: number,
  files: string[]
): Record<string, string | undefined> {
  const bucket = process.env['STORAGE_BUCKET_NAME'] || 'momtest';
  const cdn = process.env['CDN_URL'] || 'http://localhost:9000/momtest';
  const workerBucket = `${bucket}-w${index}`;

  return {
    ...process.env,
    MOMENTUM_E2E_TEST_FILES: JSON.stringify(files),
    MOMENTUM_E2E_WORKER: String(index),
    VALKEY_DB: String(index),
    STORAGE_BUCKET_NAME: workerBucket,
    // CDN_URL includes the bucket as its last path segment.
    CDN_URL: cdn.replace(/\/[^/]*$/, `/${workerBucket}`)
  };
}

interface WorkerResult {
  index: number;
  fileCount: number;
  code: number;
  seconds: number;
  output: string;
}

function runWorker(
  index: number,
  files: string[],
  children: Set<ReturnType<typeof spawn>>
): Promise<WorkerResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const chunks: Buffer[] = [];
    const child = spawn(process.execPath, getTestArgs(false), {
      env: getWorkerEnv(index, files),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.add(child);

    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finish = (code: number | null) => {
      children.delete(child);
      resolve({
        index,
        fileCount: files.length,
        code: code ?? 1,
        seconds: (Date.now() - start) / 1000,
        output: Buffer.concat(chunks).toString()
      });
    };
    child.once('error', (error) => {
      chunks.push(Buffer.from(String(error)));
      finish(1);
    });
    child.once('close', finish);
  });
}

// The reporter colours its output when run under Nx.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPES = /\u001B\[[0-9;]*m/g;

function sumReported(results: WorkerResult[], name: string): number {
  return results.reduce((total, { output }) => {
    const plain = output.replace(ANSI_ESCAPES, '');
    const match = new RegExp(`^ℹ ${name} (\\d+)$`, 'm').exec(plain);
    return total + (match ? Number.parseInt(match[1], 10) : 0);
  }, 0);
}

async function runParallel(files: string[], workers: number): Promise<number> {
  const groups = partitionFiles(files, workers);
  const children = new Set<ReturnType<typeof spawn>>();
  const killChildren = () => {
    for (const child of children) child.kill();
  };
  process.once('SIGINT', killChildren);
  process.once('SIGTERM', killChildren);

  console.log(`Running ${files.length} E2E files on ${workers} workers...`);
  const start = Date.now();

  // Each worker's output is only printed once it finishes, so the spec
  // reporters of concurrent workers don't interleave.
  const results = await Promise.all(
    groups.map((group, index) =>
      runWorker(index, group, children).then((result) => {
        const status = result.code === 0 ? 'passed' : `FAILED (${result.code})`;
        console.log(
          `\n${'='.repeat(80)}\nWorker ${index + 1}/${workers}: ` +
            `${result.fileCount} files, ${result.seconds.toFixed(1)}s, ${status}` +
            `\n${'='.repeat(80)}\n${result.output}`
        );
        return result;
      })
    )
  );

  console.log(
    `\nAll workers finished in ${((Date.now() - start) / 1000).toFixed(1)}s: ` +
      `${sumReported(results, 'tests')} tests, ` +
      `${sumReported(results, 'pass')} passed, ` +
      `${sumReported(results, 'fail')} failed, ` +
      `${sumReported(results, 'cancelled')} cancelled`
  );

  return results.some(({ code }) => code !== 0) ? 1 : 0;
}

async function runTests(): Promise<void> {
  const watchMode = process.argv.includes('--watch');
  const files = getTestFiles();
  const workers = watchMode ? 1 : getWorkerCount(files.length);

  if (workers > 1) {
    process.exitCode = await runParallel(files, workers);
    return;
  }

  // Single worker (or watch mode): everything in this process tree, using the
  // environment as-is, with live output.
  const env = { ...process.env };
  delete env['MOMENTUM_E2E_TEST_FILES'];
  const child = spawn(process.execPath, getTestArgs(watchMode), {
    stdio: 'inherit',
    env
  });
  process.once('SIGINT', () => child.kill());
  process.once('SIGTERM', () => child.kill());
  process.exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

if (require.main === module) {
  void runTests().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
