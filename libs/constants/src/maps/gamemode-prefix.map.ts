import { Gamemode } from '../enums/gamemode.enum';

export const GamemodePrefix: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.SURF, 'surf'],
  [Gamemode.BHOP, 'bhop'],
  [Gamemode.RJ, 'rj'],
  [Gamemode.SJ, 'sj'],
  [Gamemode.AHOP, 'ahop'],
  [Gamemode.CONC, 'conc'],
  [Gamemode.DEFRAG_CPM, 'df'],
  [Gamemode.DEFRAG_VQ3, 'df']
]);
