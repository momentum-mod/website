import { User } from '../user/user.model';
import { MMap } from '../map/map.model';
import { PastRun as PrismaPastRun } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';
import { LeaderboardRun } from './leaderboard-run.model';

export interface PastRun extends NumberifyBigInt<PrismaPastRun, 'stats'> {
  user?: User;
  map?: MMap;
  leaderboardRun?: LeaderboardRun;
  isPB: boolean;
}
