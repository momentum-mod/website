import { User } from '../user/user.model';
import { Map } from '../map/map.model';
import { BaseStats } from '../stats/base-stats.model';
import { Run as PrismaRun } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';
import { Rank } from './rank.model';
import { RunZoneStats } from './run-zone-stats.model';

export interface Run extends NumberifyBigInt<Omit<PrismaRun, 'file'>> {
  downloadURL: string;
  overallStats?: BaseStats;
  user?: User;
  map?: Map;
  rank?: Rank;
  zoneStats?: RunZoneStats[];
}
