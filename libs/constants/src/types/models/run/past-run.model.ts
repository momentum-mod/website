import { User } from '../user/user.model';
import { MMap } from '../map/map.model';
import { PastRun as PrismaPastRun } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export interface PastRun extends NumberifyBigInt<PrismaPastRun, 'stats'> {
  user?: User;
  map?: MMap;
  isPB: boolean;
}
