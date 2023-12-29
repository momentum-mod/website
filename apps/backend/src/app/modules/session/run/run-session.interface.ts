﻿import { Prisma, LeaderboardRun } from '@prisma/client';
import { RunStats, Style } from '@momentum/constants';

export const RUN_SESSION_COMPLETED_INCLUDE = {
  timestamps: true,
  user: true,
  mmap: true
};

const runSessionCompletedIncludeValidator =
  Prisma.validator<Prisma.RunSessionDefaultArgs>()({
    include: RUN_SESSION_COMPLETED_INCLUDE
  });

export type CompletedRunSession = Prisma.RunSessionGetPayload<
  typeof runSessionCompletedIncludeValidator
>;

export interface ProcessedRun
  extends Pick<
    LeaderboardRun,
    'userID' | 'mapID' | 'gamemode' | 'trackType' | 'trackNum' | 'time'
  > {
  stats: RunStats;
  flags: Style[];
}
