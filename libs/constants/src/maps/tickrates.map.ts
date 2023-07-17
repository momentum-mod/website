import { Gamemode } from '../enums/gamemode.enum';

/**
 * The tickrates each gamemode uses. May change in future when we allow surf
 * 100 tick etc. 0.015 <=> 66
 * 0.01 <=> 100
 * 0.008 <=> 125
 * 0.0078125 <=> 128
 */
export const Tickrates: ReadonlyMap<Gamemode, number> = new Map([
  [Gamemode.AHOP, 0.015],
  [Gamemode.BHOP, 0.01],
  [Gamemode.CONC, 0.01],
  [Gamemode.DEFRAG, 0.008],
  [Gamemode.TRICKSURF, 0.01],
  [Gamemode.KZ, 0.0078125],
  [Gamemode.PARKOUR, 0.015],
  [Gamemode.RJ, 0.015],
  [Gamemode.SJ, 0.015],
  [Gamemode.SURF, 0.015],
  [Gamemode.TRICKSURF, 0.015],
  [Gamemode.UNKNOWN, 0.015]
]);
