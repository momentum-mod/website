import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class RunFailureLoggerSerivce {
  private logs: {
    log: string;
    scope: string;
    userID: number;
    sessionID: number;
    timestamp: number;
  }[] = [];

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.schedulerRegistry.addCronJob(
      'pew pew',
      CronJob.from({
        cronTime: '*/10 * * * *',
        onTick: this.cleanOldLogs.bind(this),
        waitForCompletion: true,
        start: true
      })
    );
  }

  cleanOldLogs() {
    this.logs = this.logs.filter(
      (l) => l.timestamp < Date.now() - 60 * 60 * 1000
    );
  }

  // Collect logs when runs are happenning: (all should have a timestamp and user id!)
  // Run creation with a session id +
  // Timestamp addition with total count of timestamps ~
  // Run end with an error message
  // Session deletion +

  // Store events with an update timestamp. Delete session logs older then an hour (run a deletion job every 10 minutes)

  addLog(sessionID: number, userID: number, scope: string, log: string) {
    this.logs.push({ log, userID, scope, sessionID, timestamp: Date.now() });
  }

  getLogs() {
    if (this.logs.length === 0) return 'No logs.';

    return this.logs
      .map(
        (e) =>
          `[${new Date(e.timestamp).toISOString()}] [${e.sessionID}] [${e.userID}] [${e.scope}]: ${e.log}`
      )
      .join('\n');
  }
}
