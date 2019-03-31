import {User} from './user.model';
import {RunStats} from './run-stats.model';
import {MomentumMap} from './momentum-map.model';
import {UserMapRank} from './user-map-rank.model';

export interface Run {
  id: number;
  tickRate: number;
  time: number;
  flags: number;
  file: string;
  mapID: number;
  playerID: string;
  isPersonalBest: boolean;
  createdAt: Date; // aka dateAchieved
  updatedAt?: Date;
  user?: User;
  stats?: RunStats;
  map?: MomentumMap;
  rank?: UserMapRank;
}
