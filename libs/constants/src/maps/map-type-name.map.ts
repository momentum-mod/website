import { MapType } from '../enums/map-type.enum';

export const MapTypeName: ReadonlyMap<MapType, string> = new Map([
  [MapType.UNKNOWN, 'Unknown'],
  [MapType.SURF, 'Surf'],
  [MapType.BHOP, 'Bunny Hop'],
  [MapType.KZ, 'Climb (KZ/XC)'],
  [MapType.RJ, 'Rocket Jump'],
  [MapType.SJ, 'Sticky Jump'],
  [MapType.TRICKSURF, 'Tricksurf'],
  [MapType.AHOP, 'Accelerated Hop'],
  [MapType.PARKOUR, 'Parkour'],
  [MapType.CONC, 'Conc'],
  [MapType.DEFRAG, 'Defrag']
]);
