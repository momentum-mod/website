import {MapZone} from './map-zone.model';
import {MapTrackStats} from './map-track-stats.model';

export interface MapTrack {
  trackNum: number;
  mapID?: number;
  numZones: number;
  isLinear: boolean;
  difficulty: number;
  createdAt?: Date;
  updatedAt?: Date;
  zones?: MapZone[];
  stats?: MapTrackStats;
}
