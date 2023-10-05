import { User } from '../user/user.model';
import { MMap } from '../map/map.model';
import { LeaderboardRun as PrismaLeaderboardRun } from '@prisma/client';
import { RunStats } from '../stats/run-stats.model';
import { NumberifyBigInt } from '../../utils';
import { SetOptional } from 'type-fest';

export interface LeaderboardRun
  extends SetOptional<
    Omit<NumberifyBigInt<PrismaLeaderboardRun>, 'stats'>,
    'mapID' | 'style' | 'trackType' | 'trackNum' | 'gamemode' | 'replayHash'
  > {
  downloadURL: string;
  stats: RunStats;
  user?: User;
  map?: MMap;
}
