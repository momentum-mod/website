import { Prisma, LeaderboardRun } from '@momentum/db';
import { RunSplits, Style } from '@momentum/constants';

export const RUN_SESSION_COMPLETED_INCLUDE = {
  timestamps: true,
  user: true,
  mmap: { include: { currentVersion: true } }
};

const _runSessionCompletedIncludeValidator =
  Prisma.validator<Prisma.RunSessionDefaultArgs>()({
    include: RUN_SESSION_COMPLETED_INCLUDE
  });

export type CompletedRunSession = Prisma.RunSessionGetPayload<
  typeof _runSessionCompletedIncludeValidator
>;

export interface ProcessedRun
  extends Pick<
    LeaderboardRun,
    'userID' | 'mapID' | 'gamemode' | 'trackType' | 'trackNum' | 'time'
  > {
  splits: RunSplits.Splits;
  flags: Style[];
}
