import { Gamemode } from '../enums/gamemode.enum';

export const MapTypePrefix: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.UNKNOWN, ''],
  [Gamemode.SURF, 'surf'],
  [Gamemode.BHOP, 'bhop'],
  [Gamemode.KZ, 'climb'],
  [Gamemode.RJ, 'rj'],
  [Gamemode.SJ, 'sj'],
  [Gamemode.TRICKSURF, 'tricksurf'],
  [Gamemode.AHOP, 'ahop'],
  [Gamemode.PARKOUR, 'pk'],
  [Gamemode.CONC, 'conc'],
  [Gamemode.DEFRAG, 'df']
]);
