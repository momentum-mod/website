import { BaseStats, User, Map, Rank, RunZoneStats } from '@momentum/types';
import { Run as PrismaRun } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface Run extends NumberifyBigInt<Omit<PrismaRun, 'file'>> {
  downloadURL: string;
  overallStats?: BaseStats;
  user?: User;
  map?: Map;
  rank?: Rank;
  zoneStats?: RunZoneStats[];
}
