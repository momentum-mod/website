import { Gamemode, GamemodeCategory, GamemodeToGamemodeCategory } from '../';
import { ElementOf, ValueOf } from '../types/utils/util.type';

const GLOBAL_TAGS = ['Portals', 'Multiroute'] as const;

// prettier-ignore
const GAMEMODE_TAGS = {
  [GamemodeCategory.SURF]: [
    'Unit',
    'Tech',
    'Spins',
    'Booster',
    'Headhit',
    'Bhop'
  ] as const,
  [GamemodeCategory.BHOP]: [
    'Strafe',
    'Tech',
    'Fly',
    'Surf',
    'Weapons',
    'Spins'
  ] as const,
  [GamemodeCategory.CLIMB]: [
    'Ladder'
  ] as const,
  [GamemodeCategory.RJ]: [
    'Sync',
    'Wallpogo',
    'Speedshot',
    'Bounce',
    'Jurf',
    'Edgebug',
    'Wallbug',
    'Wallshot'
  ] as const,
  [GamemodeCategory.SJ]: [
    'Airpogo',
    'Wallpogo',
    'Vert'
  ] as const,
  [GamemodeCategory.AHOP]: [
    'HL2'
  ] as const,
  [GamemodeCategory.CONC]: [
    'Prec',
    'Juggle',
    'Limited Ammo'
  ] as const,
  [GamemodeCategory.DEFRAG]: [
    'Strafe',
    'Rocket Launcher',
    'Grenade Launcher',
    'Plasma Gun',
    'BFG',
    'Combo',
    'Haste',
    'Damageboost',
    'Climb',
    'Trick'
  ] as const
};

// We could add support for individual subcategories (Gamemodes), but don't
// have a single example of one yet.

/**
 * Union of every possible tag in Momentum.
 */
export type MapTag =
  | (typeof GLOBAL_TAGS)[number]
  | ElementOf<ValueOf<typeof GAMEMODE_TAGS>>;

export const MapTags: Map<Gamemode, Set<MapTag>> = new Map(
  [...GamemodeToGamemodeCategory.entries()].map(([gamemode, category]) => [
    gamemode,
    new Set([...GLOBAL_TAGS, ...(GAMEMODE_TAGS[category] ?? [])])
  ])
) as any;
