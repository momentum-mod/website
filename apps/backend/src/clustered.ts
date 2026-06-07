import cluster from 'node:cluster';
import { JsonValue } from 'type-fest';

export enum ClusterMessageType {
  PubSub = 'pubsub'
}

export interface ClusterMessage {
  type: ClusterMessageType;
  payload: JsonValue;
}

export function initalizeClusterMessaging(): void {
  if (!cluster.isPrimary) return;

  cluster.on('message', (worker, message) => {
    if (message?.type === ClusterMessageType.PubSub) {
      for (const w of Object.values(cluster.workers)) {
        w.send(message);
      }
    }
  });
}

export function sendClusterMessage(message: ClusterMessage): void {
  if (cluster.isWorker) {
    cluster.worker.send(message);
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
