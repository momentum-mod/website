import { BaseStats } from './base-stats.model';
import { MapZone } from './map-zone.model';

export interface MapZoneStats {
  zone?: MapZone;
  baseStats?: BaseStats;
}
