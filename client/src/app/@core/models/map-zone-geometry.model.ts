import {MapZone} from './map-zone.model';

export interface MapZoneGeometry {
  zone?: MapZone;
  pointsHeight: number;
  pointsZPos: number;
  points?: Object;
}
