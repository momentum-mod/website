import {MomentumMap} from './momentum-map.model';

export interface MapFavorite {
  id: number;
  userID: number;
  mapID: number;
  createdAt?: Date;
  updatedAt?: Date;
  map?: MomentumMap;
}
