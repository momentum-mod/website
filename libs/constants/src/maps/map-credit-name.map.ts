import { MapCreditType } from '../';

export const MapCreditNames: ReadonlyMap<MapCreditType, string> = new Map([
  [MapCreditType.AUTHOR, 'Authors'],
  [MapCreditType.CONTRIBUTOR, 'Contributors'],
  [MapCreditType.TESTER, 'Testers'],
  [MapCreditType.SPECIAL_THANKS, 'Special Thanks']
]);
