import {User} from './user.model';
import {MomentumMap} from './momentum-map.model';
import {MapCreditType} from './map-credit-type.model';

export interface MapCredit {
  id: string;
  mapID?: number;
  map?: MomentumMap;
  type: MapCreditType;
  userID?: number;
  user?: User;
  createdAt?: number;
  updatedAt?: number;
}
