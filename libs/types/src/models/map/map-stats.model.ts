import { MapStats as PrismaMapStats } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';
import { BaseStats } from '../stats/base-stats.model';

export interface MapStats
  extends NumberifyBigInt<PrismaMapStats, 'timePlayed'> {
  baseStats: BaseStats;
}
