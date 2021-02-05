import {MomentumMap} from './momentum-map.model';

export interface MapFavorite {
  id: number;
  userID: string;
  mapID: number;
  createdAt?: string;
  updatedAt?: string;
  map?: MomentumMap;
}
