import { Gamemode } from '../enums/gamemode.enum';

export const MapTypeName: ReadonlyMap<Gamemode, string> = new Map([
  [Gamemode.UNKNOWN, 'Unknown'],
  [Gamemode.SURF, 'Surf'],
  [Gamemode.BHOP, 'Bunny Hop'],
  [Gamemode.KZ, 'Climb (KZ/XC)'],
  [Gamemode.RJ, 'Rocket Jump'],
  [Gamemode.SJ, 'Sticky Jump'],
  [Gamemode.TRICKSURF, 'Tricksurf'],
  [Gamemode.AHOP, 'Accelerated Hop'],
  [Gamemode.PARKOUR, 'Parkour'],
  [Gamemode.CONC, 'Conc'],
  [Gamemode.DEFRAG, 'Defrag']
]);
