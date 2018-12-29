import {MomentumMap} from './momentum-map.model';
import {User} from './user.model';
import {Run} from './run.model';

export interface UserMapRank {
  id: number;
  mapID: number;
  userID: string;
  runID: string;
  rank: number;
  rankXP?: number;
  map?: MomentumMap;
  user?: User;
  run?: Run;
}
