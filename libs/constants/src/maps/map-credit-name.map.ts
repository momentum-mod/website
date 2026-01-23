import { MapCreditType } from '../enums/map-credit-type.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const MapCreditName: ReadonlyMap<MapCreditType, string> = new Map([
  [MapCreditType.AUTHOR, 'Author'],
  [MapCreditType.CONTRIBUTOR, 'Contributor'],
  [MapCreditType.TESTER, 'Tester'],
  [MapCreditType.SPECIAL_THANKS, 'Special']
]) satisfies CompleteMap<MapCreditType>;

export const MapCreditNames: ReadonlyMap<MapCreditType, string> = new Map([
  [MapCreditType.AUTHOR, 'Authors'],
  [MapCreditType.CONTRIBUTOR, 'Contributors'],
  [MapCreditType.TESTER, 'Testers'],
  [MapCreditType.SPECIAL_THANKS, 'Special Thanks']
]) satisfies CompleteMap<MapCreditType>;
