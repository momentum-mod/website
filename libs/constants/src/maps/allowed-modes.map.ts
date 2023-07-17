import { MapType } from '../enums/map-type.enum';

/**
 * The MapTypes that will accept run submissions
 */
export const AllowedMapTypes: ReadonlyArray<MapType> = Object.freeze([
  MapType.SURF,
  MapType.BHOP,
  MapType.RJ,
  MapType.SJ,
  MapType.AHOP,
  MapType.CONC,
  MapType.DEFRAG
]);
