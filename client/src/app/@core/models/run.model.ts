import {User} from './user.model';
import {MomentumMap} from './momentum-map.model';
import {UserMapRank} from './user-map-rank.model';
import {BaseStats} from './base-stats.model';
import {RunZoneStats} from './run-zone-stats.model';

export interface Run {
  id: number;
  trackNum: number;
  zoneNum: number;
  tickRate: number;
  ticks: number;
  time: number; // Virtual column of tickRate * ticks
  flags: number;
  file: string;
  mapID: number;
  playerID: number;
  createdAt: string; // aka dateAchieved
  updatedAt?: string;
  user?: User;
  overallStats?: BaseStats;
  zoneStats?: RunZoneStats[];
  map?: MomentumMap;
  rank?: UserMapRank;
}
