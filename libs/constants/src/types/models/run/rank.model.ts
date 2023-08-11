import { Gamemode } from '../../../enums/gamemode.enum';
import { Rank as PrismaRank } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';
import { User } from '../user/user.model';
import { Run } from './run.model';
import { MMap } from '../map/map.model';

export interface Rank extends NumberifyBigInt<PrismaRank> {
  gameType: Gamemode;
  map?: MMap;
  user?: User;
  run?: Run;
}
