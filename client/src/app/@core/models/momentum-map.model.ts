import {MomentumMapInfo} from './map-info.model';
import {MapCredit} from './map-credit.model';

export interface MomentumMap {
  id: string;
  name: string;
  statusFlag: number;
  createdAt: Date;
  info?: MomentumMapInfo;
  credits?: MapCredit[];
  leaderboardID?: string;
  download?: string;
}
