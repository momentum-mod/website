import { MapType } from '@momentum/constants';
import { User, Map, Run } from '@momentum/types';
import { Rank as PrismaRank } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface Rank extends NumberifyBigInt<PrismaRank> {
  gameType: MapType;
  map?: Map;
  user?: User;
  run?: Run;
}
