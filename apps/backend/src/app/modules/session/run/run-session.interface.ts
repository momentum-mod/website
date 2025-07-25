import { MapVersion, MMap, User } from '@momentum/db';
import { Gamemode, RunSplits, Style, TrackType } from '@momentum/constants';
import { InputJsonObject } from '@prisma/client/runtime/library';

// Note that use a plain Map + fact we're using HTTP means run sessions can
// only work on a single backend instance (without some fancy reverse proxy
// routing or something), and sessions  are not persistent across restarts.
// Upshot of this is that session IDs can just use a simple incrementing counter.
export type SessionID = number;

export interface RunSession extends Record<string, unknown> {
  id: SessionID;
  userID: number;
  mapID: number;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  timestamps: RunSessionTimestamp[];
  // Tom: I would've moved this to plain unix timestamp during moving to
  // in-memory sessions but would require updating a game api model, not worth
  // it rn.
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

export type Splits = RunSplits.Splits & InputJsonObject;

export interface ProcessedRun {
  userID: number;
  mapID: number;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  time: number;
  splits: Splits;
  flags: Style[];
}
