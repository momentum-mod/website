/**
 * Runs the E2E suite, split across parallel workers: each one a Node test
 * process with its own in-memory Postgres, Valkey database and S3 bucket (see
 * AGENTS.md). The progress display is at the bottom of the file.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sourcePath = path.join(__dirname, 'src');

// Valkey has 16 logical databases by default, one per worker.
const MAX_WORKERS = 16;
const DEFAULT_MAX_WORKERS = 4;

// The reporter colours its output when run under Nx.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPES = /\u001B\[[0-9;]*m/g;

interface WorkerResult {
  index: number;
  fileCount: number;
  code: number;
  seconds: number;
  output: string;
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

async function runParallel(files: string[], workers: number): Promise<number> {
  const groups = partitionFiles(files, workers);
  const children = new Set<ReturnType<typeof spawn>>();
  const killChildren = () => {
    for (const child of children) child.kill();
  };
  process.once('SIGINT', killChildren);
  process.once('SIGTERM', killChildren);

  const progress = groups.map(
    (group, index) => new WorkerProgress(index, group)
  );
  const dashboard = new Dashboard(progress);
  for (const worker of progress) {
    // Don't wait for the end to find out something's broken.
    worker.onFailure = (name) => dashboard.reportFailure(worker.index, name);
  }

  console.log(`Running ${files.length} E2E files on ${workers} workers...`);
  const start = Date.now();
  dashboard.start();

  const results = await Promise.all(
    groups.map((group, index) =>
      runWorker(index, group, children, progress[index])
    )
  );
  dashboard.stop();

  // Workers' output is kept until now so their spec reporters don't interleave
  // with each other (or the progress).
  for (const result of results) {
    const status = result.code === 0 ? 'passed' : `FAILED (${result.code})`;
    console.log(
      `\n${'='.repeat(80)}\nWorker ${result.index + 1}/${workers}: ` +
        `${result.fileCount} files, ${result.seconds.toFixed(1)}s, ${status}` +
        `\n${'='.repeat(80)}\n${result.output}`
    );
  }

  console.log(
    `\nAll ${workers} workers finished in ${((Date.now() - start) / 1000).toFixed(1)}s: ` +
      `${sumReported(results, 'tests')} tests, ` +
      `${sumReported(results, 'pass')} passed, ` +
      `${sumReported(results, 'fail')} failed, ` +
      `${sumReported(results, 'cancelled')} cancelled`
  );

  return results.some(({ code }) => code !== 0) ? 1 : 0;
}

function runWorker(
  index: number,
  files: string[],
  children: Set<ReturnType<typeof spawn>>,
  progress: WorkerProgress
): Promise<WorkerResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const chunks: Buffer[] = [];
    const child = spawn(process.execPath, getTestArgs(false), {
      env: getWorkerEnv(index, files),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.add(child);

    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      progress.feed(chunk);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    const finish = (code: number | null) => {
      children.delete(child);
      progress.finish(code ?? 1);
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

function getTestArgs(watchMode: boolean): string[] {
  return [
    '--test',
    '--test-reporter=spec',
    // Run the loader in the runner's own process rather than a child (saving a
    // whole process worth of memory per worker), which watch mode can't do.
    ...(watchMode ? ['--watch'] : ['--test-isolation=none']),
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

/** Add up a count from the summary each worker's test runner prints. */
function sumReported(results: WorkerResult[], name: string): number {
  return results.reduce((total, { output }) => {
    const plain = output.replace(ANSI_ESCAPES, '');
    const match = new RegExp(`^ℹ ${name} (\\d+)$`, 'm').exec(plain);
    return total + (match ? Number.parseInt(match[1], 10) : 0);
  }, 0);
}

//#region Progress display

/**
 * Follows one worker's spec reporter output (without keeping it) to work out
 * how far through its files it is.
 *
 * Suites are `▶ name` when they start and `✔ name (12ms)` when they finish, at
 * the same indentation; tests only print their `✔`/`✖` result. Every file has
 * one root `describe`, and the loader runs a worker's files in order, so the
 * root suites that have finished tell us which file is up next.
 */
class WorkerProgress {
  /** Tests that have finished, and how many of them failed. */
  tests = 0;
  failed = 0;
  /** Root suites (files) that have finished. */
  filesDone = 0;
  /** Set once the worker's process has exited. */
  exitCode?: number;
  startedAt = Date.now();
  endedAt?: number;
  onFailure?: (testName: string) => void;

  private readonly estimates: number[];
  private completedTests = 0;
  private openSuites: Array<{ indent: number; name: string }> = [];
  private partialLine = '';
  private inSummary = false;

  constructor(
    readonly index: number,
    readonly files: string[]
  ) {
    this.estimates = files.map(estimateTestCount);
  }

  feed(chunk: Buffer): void {
    const lines = (this.partialLine + chunk.toString())
      .replace(ANSI_ESCAPES, '')
      .split(/\r?\n/);
    this.partialLine = lines.pop() ?? '';
    for (const line of lines) this.feedLine(line);
  }

  finish(code: number): void {
    this.exitCode = code;
    this.endedAt = Date.now();
  }

  get done(): boolean {
    return this.exitCode !== undefined;
  }

  get elapsedSeconds(): number {
    return ((this.endedAt ?? Date.now()) - this.startedAt) / 1000;
  }

  /**
   * 0 to 1, by number of tests. We only know how many tests a file has once
   * it's finished, so until then it's guessed from the number of `it` calls in
   * the source (which undercounts tests made in loops, hence the max).
   */
  get fraction(): number {
    if (this.done && this.exitCode === 0) return 1;
    // Every file has run; if it still failed, that's shown by the colour.
    if (this.filesDone >= this.files.length) return 1;

    const current = this.filesDone;
    const inCurrentFile = this.tests - this.completedTests;
    const currentEstimate = Math.max(
      this.estimates[current] ?? 0,
      inCurrentFile + 1
    );
    const remaining = this.estimates
      .slice(current + 1)
      .reduce((total, count) => total + count, 0);
    const total = this.completedTests + currentEstimate + remaining;

    // Never claim to be finished until the process is.
    return Math.min(this.tests / total, 0.99);
  }

  private feedLine(line: string): void {
    if (this.inSummary) return;
    // The summary repeats the failed tests, which we've already counted.
    if (/^ℹ tests \d+$/.test(line)) {
      this.inSummary = true;
      return;
    }

    const start = /^(\s*)▶ (.+)$/.exec(line);
    if (start) {
      this.openSuites.push({ indent: start[1].length, name: start[2] });
      return;
    }

    const result = /^(\s*)(✔|✖) (.+?) \([\d.]+ms\)/.exec(line);
    if (!result) return;

    const [, whitespace, mark, name] = result;
    const indent = whitespace.length;
    const suite = this.openSuites.at(-1);

    if (suite && suite.indent === indent && suite.name === name) {
      this.openSuites.pop();
      if (indent === 0) {
        this.filesDone++;
        this.completedTests = this.tests;
      }
      return;
    }

    this.tests++;
    if (mark === '✖') {
      this.failed++;
      this.onFailure?.(name);
    }
  }
}

/** A rough number of tests in a file: how many `it`/`test` calls it has. */
function estimateTestCount(file: string): number {
  try {
    const source = readFileSync(file, 'utf8');
    const calls = source.match(/^\s*(?:it|test)(?:\.\w+)?\s*\(/gm);
    return Math.max(1, calls?.length ?? 0);
  } catch {
    return 1;
  }
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const PARTIAL_BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉'];
const FRAME_INTERVAL_MS = 80;
const PLAIN_INTERVAL_MS = 15_000;

/**
 * Whether to animate the progress. On by default, even when stdout doesn't look
 * like a terminal, as it doesn't when run through Nx. Off in CI, where logs
 * get a plain line every so often instead. `MOMENTUM_E2E_PROGRESS` can be set
 * to `fancy` or `plain` to override either way.
 */
const FANCY_PROGRESS = ((): boolean => {
  const setting = process.env['MOMENTUM_E2E_PROGRESS'];
  if (setting === 'fancy') return true;
  if (setting === 'plain') return false;
  return !process.env['CI'];
})();

const useColor = (): boolean =>
  FANCY_PROGRESS && process.env['NO_COLOR'] === undefined;

const paint =
  (code: string) =>
  (text: string): string =>
    useColor() ? `\u001B[${code}m${text}\u001B[0m` : text;
const green = paint('32');
const red = paint('31');
const cyan = paint('36');
const dim = paint('2');
const bold = paint('1');

/** A smooth bar, in eighths of a character. */
function renderBar(
  fraction: number,
  width: number,
  color: (text: string) => string
): string {
  const eighths = Math.round(Math.max(0, Math.min(1, fraction)) * width * 8);
  const full = Math.floor(eighths / 8);
  const partial = PARTIAL_BLOCKS[eighths % 8];
  const empty = width - full - (partial ? 1 : 0);
  return color('█'.repeat(full) + partial) + dim('░'.repeat(empty));
}

const formatSeconds = (seconds: number): string => {
  const whole = Math.floor(seconds);
  return whole >= 60
    ? `${Math.floor(whole / 60)}m${String(whole % 60).padStart(2, '0')}s`
    : `${whole}s`;
};

/**
 * Live progress for every worker. On a terminal, a block of animated bars that
 * is redrawn in place; otherwise (CI logs) a plain line every so often.
 */
class Dashboard {
  private readonly interactive = FANCY_PROGRESS;
  private timer?: NodeJS.Timeout;
  private frame = 0;
  private drawnLines = 0;
  private readonly startedAt = Date.now();

  constructor(private readonly workers: WorkerProgress[]) {}

  start(): void {
    if (this.interactive) {
      process.stdout.write('\u001B[?25l'); // hide cursor
      this.timer = setInterval(() => this.draw(), FRAME_INTERVAL_MS);
      this.draw();
    } else {
      this.timer = setInterval(() => this.logPlain(), PLAIN_INTERVAL_MS);
    }
    // A finished frame on the screen if we're killed
    process.once('exit', () => this.showCursor());
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.interactive) {
      this.draw();
      this.showCursor();
    }
  }

  /** Print a failed test's name above the progress as soon as it happens. */
  reportFailure(workerIndex: number, testName: string): void {
    this.log(`${red('✖')} ${dim(`worker ${workerIndex + 1}`)} ${testName}`);
  }

  /** Print a line above the progress, without it getting trampled. */
  private log(message: string): void {
    if (!this.interactive) {
      console.log(message);
      return;
    }
    this.erase();
    console.log(message);
    this.draw();
  }

  private showCursor(): void {
    if (this.interactive) process.stdout.write('\u001B[?25h');
  }

  private erase(): void {
    if (this.drawnLines > 0)
      process.stdout.write(`\u001B[${this.drawnLines}A\u001B[0J`);
    this.drawnLines = 0;
  }

  private draw(): void {
    const spinner = SPINNER_FRAMES[this.frame++ % SPINNER_FRAMES.length];
    const columns = process.stdout.columns ?? 100;
    const barWidth = Math.max(10, Math.min(40, columns - 74));

    const totalTests = this.workers.reduce((sum, w) => sum + w.tests, 0);
    const totalFailed = this.workers.reduce((sum, w) => sum + w.failed, 0);
    const average =
      this.workers.reduce((sum, w) => sum + w.fraction, 0) /
      this.workers.length;
    const finished = this.workers.every((w) => w.done);

    const lines = [
      `${bold('E2E')} ${dim('·')} ${this.workers.length} workers ${dim('·')} ` +
        `${this.workers.reduce((sum, w) => sum + w.files.length, 0)} files`
    ];

    for (const worker of this.workers) {
      const failing = worker.failed > 0 || (worker.exitCode ?? 0) !== 0;
      const color = failing ? red : worker.done ? green : cyan;
      const icon = !worker.done
        ? color(spinner)
        : failing
          ? red('✖')
          : green('✔');
      const percent = `${Math.floor(worker.fraction * 100)}%`.padStart(4);
      lines.push(
        `${icon} ${dim('worker')} ${String(worker.index + 1).padStart(2)} ` +
          `${renderBar(worker.fraction, barWidth, color)} ${bold(percent)} ` +
          `${dim(`${worker.filesDone}/${worker.files.length} files`.padEnd(11))} ` +
          `${String(worker.tests).padStart(4)} tests ` +
          (worker.failed > 0 ? red(`${worker.failed} failed `) : '') +
          dim(formatSeconds(worker.elapsedSeconds))
      );
    }

    const totalColor = totalFailed > 0 ? red : finished ? green : cyan;
    lines.push(
      `${dim('─'.repeat(Math.min(columns - 1, barWidth + 58)))}\n` +
        `${finished ? totalColor(totalFailed > 0 ? '✖' : '✔') : totalColor(spinner)} ` +
        `${dim('total    ')} ${renderBar(average, barWidth, totalColor)} ` +
        `${bold(`${Math.floor(average * 100)}%`.padStart(4))} ` +
        `${' '.repeat(11)} ${String(totalTests).padStart(4)} tests ` +
        (totalFailed > 0 ? red(`${totalFailed} failed `) : '') +
        dim(formatSeconds((Date.now() - this.startedAt) / 1000))
    );

    this.erase();
    const output = lines.join('\n');
    process.stdout.write(`${output}\n`);
    this.drawnLines = output.split('\n').length;
  }

  private logPlain(): void {
    const parts = this.workers.map(
      (w) => `w${w.index + 1} ${Math.floor(w.fraction * 100)}%`
    );
    const tests = this.workers.reduce((sum, w) => sum + w.tests, 0);
    const failed = this.workers.reduce((sum, w) => sum + w.failed, 0);
    console.log(
      `[${formatSeconds((Date.now() - this.startedAt) / 1000).padStart(5)}] ` +
        `${parts.join(' · ')} | ${tests} tests, ${failed} failed`
    );
  }
}

//#endregion

// Last, as the classes and constants above can't be used before they're defined.
if (require.main === module) {
  void runTests().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
