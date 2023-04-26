import { MapZoneStats } from './map-zone-stats.model';
import { MapZoneTrigger } from './map-zone-trigger.model';
import { MapTrack } from './map-track.model';

export interface MapZone {
  track?: MapTrack;
  zoneNum: number;
  triggers?: MapZoneTrigger[];
  stats?: MapZoneStats;
}
