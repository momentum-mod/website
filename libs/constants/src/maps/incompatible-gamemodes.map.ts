import { Gamemode as G } from '../';

export const IncompatibleGamemodes: ReadonlyMap<G, G[]> = new Map([
  [G.SURF, [G.BHOP]],
  [G.BHOP, [G.SURF]],
  [G.RJ, [G.SURF, G.BHOP, G.AHOP]],
  [G.SJ, [G.SURF, G.BHOP, G.AHOP]],
  [G.AHOP, [G.SURF]],
  [G.CONC, [G.SURF, G.BHOP, G.AHOP]],
  [G.DEFRAG_CPM, [G.SURF]],
  [G.DEFRAG_VQ3, [G.SURF]]
]);
