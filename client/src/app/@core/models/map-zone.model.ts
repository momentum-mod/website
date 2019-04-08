import {MapZoneStats} from './map-zone-stats.model';
import {MapZoneGeometry} from './map-zone-geometry.model';
import {MapTrack} from './map-track.model';
import {MapZoneProperties} from './map-zone-properties.model';

export interface MapZone {
  track?: MapTrack;
  zoneNum: number;
  zoneType: number;
  zoneProps?: MapZoneProperties;
  geometry?: MapZoneGeometry;
  stats?: MapZoneStats;
}
