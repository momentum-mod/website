import { BaseStats, ZoneStats } from '@momentum/replay';
import { Prisma, Rank, Run as RunDB } from '@prisma/client';
import { XpGainDto } from '@momentum/backend/dto';

export const RUN_SESSION_COMPLETED_INCLUDE = {
  timestamps: true,
  track: {
    include: {
      mmap: { include: { info: true, stats: true } },
      stats: { include: { baseStats: true } },
      zones: { include: { stats: { include: { baseStats: true } } } }
    }
  },
  user: true
};

const runSessionCompletedIncludeValidator =
  Prisma.validator<Prisma.RunSessionArgs>()({
    include: RUN_SESSION_COMPLETED_INCLUDE
  });

export type CompletedRunSession = Prisma.RunSessionGetPayload<
  typeof runSessionCompletedIncludeValidator
>;

export type ProcessedRun = Omit<
  RunDB,
  'id' | 'createdAt' | 'updatedAt' | 'overallStatsID' | 'file' | 'hash'
> & {
  overallStats: BaseStats;
  zoneStats: ZoneStats[];
};

export interface StatsUpdateReturn {
  isPersonalBest: boolean;
  isWorldRecord: boolean;
  existingRank: Rank;
  rankCreate: Prisma.RankCreateWithoutRunInput;
  xp: XpGainDto;
}
