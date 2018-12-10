import {User} from './user.model';
import {RunStats} from './run-stats.model';
import {MomentumMap} from './momentum-map.model';

export interface Run {
  id: number;
  tickRate: number;
  dateAchieved: Date;
  time: number;
  flags: number;
  file: string;
  mapID: number;
  playerID: number;
  isPersonalBest: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  user?: User;
  stats?: RunStats;
  map?: MomentumMap;
}
