import { MapType } from './map-type.enum';

export const MapTypePrefix: Record<MapType, string> = {
  [MapType.UNKNOWN]: '',
  [MapType.SURF]: 'surf',
  [MapType.BHOP]: 'bhop',
  [MapType.KZ]: 'climb',
  [MapType.RJ]: 'rj',
  [MapType.SJ]: 'sj',
  [MapType.TRICKSURF]: 'tricksurf',
  [MapType.AHOP]: 'ahop',
  [MapType.PARKOUR]: 'pk',
  [MapType.CONC]: 'conc',
  [MapType.DEFRAG]: 'df'
};
