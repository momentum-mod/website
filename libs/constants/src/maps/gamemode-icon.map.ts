import { Gamemode } from '../enums/gamemode.enum';

export const GamemodeIcon: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.SURF, 'assets/images/gamemodes/surf.png'],
  [Gamemode.BHOP, 'assets/images/gamemodes/bhop.png'],
  [Gamemode.RJ, 'assets/images/gamemodes/rj.png'],
  [Gamemode.SJ, 'assets/images/gamemodes/sj.png'],
  [Gamemode.AHOP, 'assets/images/gamemodes/ahop.png'],
  [Gamemode.CONC, 'assets/images/gamemodes/conc.png'],
  [Gamemode.DEFRAG_CPM, 'assets/images/gamemodes/defrag.png'],
  [Gamemode.DEFRAG_VQ3, 'assets/images/gamemodes/defrag.png']
]);
