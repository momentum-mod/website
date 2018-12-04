import {MomentumMapInfo} from './map-info.model';
import {MapCredit} from './map-credit.model';
import {User} from './user.model';
import {MapStats} from './map-stats.model';
import {MapImage} from './map-image.model';

export interface MomentumMap {
  id: number;
  name: string;
  hash: string;
  statusFlag: number;
  createdAt?: Date;
  updatedAt?: Date;
  info?: MomentumMapInfo;
  credits?: MapCredit[];
  images?: MapImage[];
  stats?: MapStats;
  downloadURL?: string;
  submitterID?: string;
  submitter?: User;
}
