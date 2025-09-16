import { Injectable, OnModuleInit } from '@nestjs/common';
import cluster from 'node:cluster';

export interface ClusterServiceOnlineMessage {
  cmd: 'service_online';
}

export interface ClusterSetFirstWorkerMessage {
  cmd: 'set_first_worker';
  id: number;
}

export type ClusterMessage =
  | ClusterServiceOnlineMessage
  | ClusterSetFirstWorkerMessage;

@Injectable()
export class ClusterService implements OnModuleInit {
  private _areWeFirstWorker = false;

  async onModuleInit(): Promise<void> {
    // Single-process mode, always primary.
    if (cluster.isPrimary) {
      this._areWeFirstWorker = true;
      return;
    }

    return new Promise<void>((resolve) => {
      let resolved = false;

      cluster.worker.on('message', (message: ClusterMessage) => {
        if (message.cmd === 'set_first_worker') {
          this._areWeFirstWorker = message.id === cluster.worker.id;

          // Resolve out of this promise first time we get the message, this
          // ensures that any services depending on ClusterService will only
          // start after we know if we're primary or not.
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }
      });

      cluster.worker.send({ cmd: 'service_online' });
    });
  }

  /**
   * Tells whether the current process is the "first" worker.
   * Use this when you only want to run a scheduled task on a single worker
   * (registering cronjob on all but early returning in callback is fine!),
   * or if you have some other task that should only be done by one worker.
   *
   * In single-process mode, this is always true.
   */
  get areWeFirstWorker(): boolean {
    return this._areWeFirstWorker;
  }
}
