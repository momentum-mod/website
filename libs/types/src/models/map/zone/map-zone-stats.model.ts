import { MapZoneStats as PrismaMapZoneStats } from '@prisma/client';
import { NumberifyBigInt } from '../../../utility.interface';
import { BaseStats } from '../../stats/base-stats.model';

export interface MapZoneStats
  extends NumberifyBigInt<
    Omit<PrismaMapZoneStats, 'id' | 'zoneID' | 'baseStatsID'>
  > {
  baseStats?: BaseStats;
}
