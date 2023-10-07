import { Gamemode } from '../enums/gamemode.enum';

export const MapTypeName: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.SURF, 'Surf'],
  [Gamemode.BHOP, 'Bhop'],
  [Gamemode.RJ, 'Rocket Jump'],
  [Gamemode.SJ, 'Sticky Jump'],
  [Gamemode.AHOP, 'Ahop'],
  [Gamemode.CONC, 'Conc'],
  [Gamemode.DEFRAG_CPM, 'Defrag (CPM)'],
  [Gamemode.DEFRAG_VQ3, 'Defrag (VQ3)']
]);
