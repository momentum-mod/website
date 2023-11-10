import { Gamemode as G } from '../';

/**
 * A non-reflexive map of gamemodes and collections of gamemodes they can
 * *never* have compatibile leaderboards for.
 *
 * For example, there's *never* a possible case
 * where a surf leaderboard should also have a bhop leaderboard, that'd just be
 * jank 100-tick surf.
 *
 * Note the non-reflexivity, you might have a surf map that's worth a
 * leaderboard in ahop (e.g. utopia), but a ahop map would never have a surf
 * leaderboard, since that'd just be bhop with worse settings.
 */
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
