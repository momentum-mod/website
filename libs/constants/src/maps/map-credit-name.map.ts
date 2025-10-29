import { MapCreditType } from '../enums/map-credit-type.enum';

export const MapCreditName: ReadonlyMap<MapCreditType, string> = new Map([
  [MapCreditType.AUTHOR, 'Author'],
  [MapCreditType.CONTRIBUTOR, 'Contributor'],
  [MapCreditType.TESTER, 'Tester'],
  [MapCreditType.SPECIAL_THANKS, 'Special']
]);

export const MapCreditNames: ReadonlyMap<MapCreditType, string> = new Map([
  [MapCreditType.AUTHOR, 'Authors'],
  [MapCreditType.CONTRIBUTOR, 'Contributors'],
  [MapCreditType.TESTER, 'Testers'],
  [MapCreditType.SPECIAL_THANKS, 'Special Thanks']
]);
