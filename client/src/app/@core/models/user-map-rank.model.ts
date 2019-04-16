import {MomentumMap} from './momentum-map.model';
import {User} from './user.model';
import {Run} from './run.model';

export interface UserMapRank {
  id: number;
  mapID: number;
  userID: number;
  runID: string;
  gameType: number;
  flags: number;
  trackNum: number;
  zoneNum: number;
  rank: number;
  rankXP?: number;
  map?: MomentumMap;
  user?: User;
  run?: Run;
}
