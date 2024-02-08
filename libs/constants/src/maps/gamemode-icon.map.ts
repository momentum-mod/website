import { Gamemode } from '../enums/gamemode.enum';

export const GamemodeIcon: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.SURF, 'surf.png'],
  [Gamemode.BHOP, 'bhop.png'],
  [Gamemode.RJ, 'rj.png'],
  [Gamemode.SJ, 'sj.png'],
  [Gamemode.AHOP, 'ahop.png'],
  [Gamemode.CONC, 'conc.png'],
  [Gamemode.DEFRAG_CPM, 'defrag.png'],
  [Gamemode.DEFRAG_VQ3, 'defrag.png']
]);
