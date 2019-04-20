import {MapZone} from './map-zone.model';
import {MapZoneProperties} from './map-zone-properties.model';

export interface MapZoneTrigger {
  zone?: MapZone;
  type: number;
  pointsHeight: number;
  pointsZPos: number;
  points?: Object;
  zoneProps?: MapZoneProperties;
}
