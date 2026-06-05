import cluster from 'node:cluster';

export enum ClusterMessageType {
  PubSub = 'pubsub'
}

export interface ClusterMessage {
  type: ClusterMessageType;
  payload: unknown;
}

/**
 * Set up cross-worker message relaying on the primary process.
 *
 * Workers can't message each other directly, so any worker wanting to broadcast
 * sends to the primary, which fans the message back out to every worker
 * (including the original sender). No-op outside the primary process.
 *
 * Must be called from the primary in both single- and clustered-process modes.
 */
export function initalizeClusterMessaging(): void {
  if (!cluster.isPrimary) return;

  cluster.on('message', (_worker, message: ClusterMessage) => {
    if (message?.type !== ClusterMessageType.PubSub) return;
    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.send(message);
    }
  });
}

/**
 * Send a message from a worker up to the primary for fan-out to all workers.
 *
 * No-op outside a worker process; single-process mode delivers locally without
 * going through IPC.
 */
export function sendClusterMessage(message: ClusterMessage): void {
  if (cluster.isWorker) {
    process.send?.(message);
  }
}

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
