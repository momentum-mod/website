export const FIRST_WORKER_ENV_VAR = 'NEST_WORKER_IS_PRIMARY';

/**
 * Returns true if the current process is the "first" worker in a clustered
 * environment, false otherwise.
 *
 * Always returns true in single-process mode.
 *
 * Allows a single worker to take responsibility for tasks that should only
 * be done once, such as scheduled jobs or background processing.
 *
 * May switch to some system of distributed locks in the future, fine for now.
 */
export function isFirstWorker(): boolean {
  // Easier for test setup to return true iff env var is not explicitly 'false'
  return process.env[FIRST_WORKER_ENV_VAR] !== 'false';
}
