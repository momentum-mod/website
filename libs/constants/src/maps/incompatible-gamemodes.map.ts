import { Gamemode, GamemodeCategories, GamemodeCategory } from '../';

// Silly little system for passing whole categories into this structure, rather
// than each individual gamemode, but structured so we could do single gamemodes
// in future if needed. Lots of these are singleton categories but using them
// for future-proofing, for example 100t surf would have the exact same rules
// as regular surf.
// JAVASCRIPT PLEASE ADD CONSTEXPR!!!
const G = Gamemode; //
const GC = GamemodeCategory;
const Cats = (...gcs: GamemodeCategory[]) =>
  gcs.flatMap((gc) => GamemodeCategories.get(gc)!);

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
// prettier-ignore
export const IncompatibleGamemodes: ReadonlyMap<Gamemode, ReadonlySet<Gamemode>> = new Map(
  [
    [G.SURF,        [Cats(GC.BHOP, GC.CLIMB)]],
    [G.BHOP,        [Cats(GC.SURF, GC.CLIMB)]],
    [G.BHOP_HL1,    [Cats(GC.SURF, GC.CLIMB)]],
    [G.CLIMB_MOM,   [Cats(GC.SURF, GC.BHOP)]],
    [G.CLIMB_KZT,   [Cats(GC.SURF, GC.BHOP)]],
    [G.CLIMB_16,    [Cats(GC.SURF, GC.BHOP)]],
    [G.RJ,          [Cats(GC.SURF, GC.CLIMB, GC.BHOP, GC.AHOP)]],
    [G.SJ,          [Cats(GC.SURF, GC.CLIMB, GC.BHOP, GC.AHOP)]],
    [G.AHOP,        [Cats(GC.SURF, GC.CLIMB)]],
    [G.CONC,        [Cats(GC.SURF, GC.CLIMB, GC.BHOP, GC.AHOP)]],
    [G.DEFRAG_CPM,  [Cats(GC.SURF, GC.CLIMB)]],
    [G.DEFRAG_VQ3,  [Cats(GC.SURF, GC.CLIMB)]],
    [G.DEFRAG_VTG,  [Cats(GC.SURF, GC.CLIMB)]]
  ].map(([k, v]) => [
    k as Gamemode,
    new Set((v as [Gamemode | Gamemode[]]).flat())
  ])
);
