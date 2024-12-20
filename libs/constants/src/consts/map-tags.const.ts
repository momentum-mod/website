import { Gamemode, GamemodeCategory, GamemodeToGamemodeCategory } from '../';
import { ElementOf, ValueOf } from '../types/utils/util.type';

const GLOBAL_TAGS = [
  'Portals',
  'Multiroute',
  'Low Grav',
  'Gimmick',
  'Endurance',
  'Collectibles',
  'Anti Grav',
  'Moving Surfaces'
] as const;

const GAMEMODE_TAGS = {
  [GamemodeCategory.SURF]: [
    'Unit',
    'Tech',
    'Spins',
    'Booster',
    'Headhit',
    'Bhop',
    'Maxvel',
    'Fall',
    'Rampstrafe',
    'Headcheck'
  ] as const,
  [GamemodeCategory.BHOP]: [
    'Strafe',
    'Tech',
    'Fly',
    'Surf',
    'Weapons',
    'Spins',
    'Spikes',
    'Slopes',
    'Misaligned Teleporter',
    'Climb',
    'Ladder',
    'Jumppad',
    'Booster'
  ] as const,
  [GamemodeCategory.CLIMB]: [
    'Ladder',
    'Bhop',
    'Slide',
    'Longjump',
    'Ceiling Smash',
    'CS Practice',
    'Single Hop'
  ] as const,
  [GamemodeCategory.RJ]: [
    'Sync',
    'Wallpogo',
    'Speedshot',
    'Bounce',
    'Bouncehop',
    'Jurf',
    'Edgebug',
    'Wallshot',
    'Phase',
    'Prefire',
    'Buttons',
    'Limited Ammo',
    'Water',
    'Teledoor'
  ] as const,
  [GamemodeCategory.SJ]: [
    'Airpogo',
    'Wallpogo',
    'Vert',
    'Limited Ammo',
    'Phase',
    'Rollerpogo',
    'Downair',
    'Slanted Walls',
    'Teledoor'
  ] as const,
  [GamemodeCategory.AHOP]: [
    'HL2',
    'Speed Control',
    'Displacements',
    'Surf'
  ] as const,
  [GamemodeCategory.CONC]: [
    'Prec',
    'Juggle',
    'Juggleprec',
    'Limited Ammo',
    'Handheld'
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
    'Trick',
    'Slick',
    'Torture',
    'Overbounce',
    'LG Climb',
    'Rocket Stack',
    'Buttons',
    'Air Jump'
  ] as const
} satisfies Record<GamemodeCategory, string[]>;

// We could add support for individual subcategories (Gamemodes), but don't
// have a single example of one yet.

/**
 * Union of every possible tag in Momentum.
 */
export type MapTag =
  | (typeof GLOBAL_TAGS)[number]
  | ElementOf<ValueOf<typeof GAMEMODE_TAGS>>;

export const MapTags: Map<Gamemode, MapTag[]> = new Map(
  // TODO: Spread unnecessary with TS 5.6 (i think) iterator methods
  [...GamemodeToGamemodeCategory.entries()].map(([gamemode, category]) => [
    gamemode,
    [...GLOBAL_TAGS, ...GAMEMODE_TAGS[category]].sort() // Alphabetical
  ])
);
