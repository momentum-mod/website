import {MomentumMap} from './momentum-map.model';

export interface MapLibraryEntry {
  id: number;
  userID: string;
  mapID: number;
  createdAt?: string; // Date
  updatedAt?: string; // Date
  map: MomentumMap;
}
