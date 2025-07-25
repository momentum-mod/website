import { LeaderboardRun, MapVersion, MMap, User } from '@prisma/client';
import { RunSplits, Style } from '@momentum/constants';

// Note that use a plain Map + fact we're using HTTP means run sessions can
// only work on a single backend instance (without some fancy reverse proxy
// routing or something), and sessions  are not persistent across restarts.
// Upshot of this is that session IDs can just use a simple incrementing counter.
export type SessionID = number;

export interface RunSession extends Record<string, unknown> {
  userID: number;
  mapID: number;
  gamemode: number;
  trackType: number;
  trackNum: number;
  timestamps: RunSessionTimestamp[];
  createdAt: Date;
}

export interface CompletedRunSession extends RunSession {
  mmap: MMap & { currentVersion: MapVersion };
  user: User;
}

export interface RunSessionTimestamp extends Record<string, unknown> {
  majorNum: number;
  minorNum: number;
  time: number;
  createdAt: Date;
}

export interface ProcessedRun
  extends Pick<
    LeaderboardRun,
    'userID' | 'mapID' | 'gamemode' | 'trackType' | 'trackNum' | 'time'
  > {
  splits: RunSplits.Splits;
  flags: Style[];
}
