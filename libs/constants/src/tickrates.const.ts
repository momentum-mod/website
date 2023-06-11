import { MapType } from './map-type.enum';

/**
 * The tickrates each gamemode uses. May change in future when we allow surf
 * 100 tick etc. 0.015 <=> 66
 * 0.01 <=> 100
 * 0.008 <=> 125
 * 0.0078125 <=> 128
 */
export const Tickrates: Record<MapType, number> = {
  [MapType.AHOP]: 0.015,
  [MapType.BHOP]: 0.01,
  [MapType.CONC]: 0.01,
  [MapType.DEFRAG]: 0.008,
  [MapType.TRICKSURF]: 0.01,
  [MapType.KZ]: 0.0078125,
  [MapType.PARKOUR]: 0.015,
  [MapType.RJ]: 0.015,
  [MapType.SJ]: 0.015,
  [MapType.SURF]: 0.015,
  [MapType.TRICKSURF]: 0.015,
  [MapType.UNKNOWN]: 0.015
};
