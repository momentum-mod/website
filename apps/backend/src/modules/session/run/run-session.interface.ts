import { BaseStats, ZoneStats } from '@momentum/replay';
import { Prisma, Rank, Run as RunDB } from '@prisma/client';
import { XpGainDto } from '@momentum/backend/dto';

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
