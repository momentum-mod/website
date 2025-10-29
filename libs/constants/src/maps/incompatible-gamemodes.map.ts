import { Gamemode, GamemodeCategory } from '../enums/gamemode.enum';
import { GamemodeCategories } from './gamemodes.map';

// Silly little system for passing whole categories into this structure, rather
// than each individual gamemode, but structured so we could do single gamemodes
// in future if needed. Lots of these are singleton categories but using them
// for future-proofing, for example 100t surf would have the exact same rules
// as regular surf.
// JAVASCRIPT PLEASE ADD CONSTEXPR!!!
const G = Gamemode;
const GC = GamemodeCategory;
const Cats = (...gcs: GamemodeCategory[]) =>
  gcs.flatMap((gc) => GamemodeCategories.get(gc)!);

/**
 * A non-reflexive map of gamemodes and collections of gamemodes they can
 * *never* have compatibile leaderboards for.
 *
 * For example, there's *never* a possible case where a surf leaderboard should
 * also have a bhop leaderboard, that'd just be jank 100-tick surf.
 *
 * Note the non-reflexivity, some bhop maps are playable in climb, but no climb
 * map has a bhop leaderboard, as we don't want to have an easy mode of climb
 * with autohop.
 */
// prettier-ignore
export const IncompatibleGamemodes: ReadonlyMap<Gamemode, ReadonlySet<Gamemode>> = new Map(
  [
    [G.SURF,        [Cats(GC.BHOP), G.CLIMB_MOM, G.CLIMB_KZT]],
    [G.BHOP,        [Cats(GC.SURF), G.CLIMB_MOM, G.CLIMB_KZT]],
    [G.BHOP_HL1,    [Cats(GC.SURF), G.CLIMB_MOM, G.CLIMB_KZT]],
    [G.CLIMB_MOM,   [Cats(GC.SURF, GC.BHOP)]],
    [G.CLIMB_KZT,   [Cats(GC.SURF, GC.BHOP)]],
    [G.CLIMB_16,    [Cats(GC.SURF, GC.BHOP)]],
    [G.RJ,          []],
    [G.SJ,          []],
    [G.AHOP,        []],
    [G.CONC,        []],
    [G.DEFRAG_CPM,  []],
    [G.DEFRAG_VQ3,  []],
    [G.DEFRAG_VTG,  []]
  ].map(([k, v]) => [
    k as Gamemode,
    new Set((v as [Gamemode | Gamemode[]]).flat())
  ])
);
