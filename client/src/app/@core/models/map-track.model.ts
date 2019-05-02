import {MapZone} from './map-zone.model';
import {MapTrackStats} from './map-track-stats.model';

export interface MapTrack {
  trackNum: number;
  mapID?: number;
  numZones: number;
  isLinear: boolean;
  difficulty: number;
  createdAt?: string;
  updatedAt?: string;
  zones?: MapZone[];
  stats?: MapTrackStats;
}
