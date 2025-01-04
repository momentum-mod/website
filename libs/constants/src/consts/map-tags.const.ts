import { Gamemode, GamemodeCategory, GamemodeToGamemodeCategory } from '../';

export enum MapTag {
  PORTALS = 1,
  MULTIROUTE = 2,
  LOW_GRAV = 3,
  GIMMICK = 4,
  ENDURANCE = 5,
  COLLECTIBLES = 6,
  ANTI_GRAV = 7,
  MOVING_SURFACES = 8,
  UNIT = 9,
  TECH = 10,
  SPINS = 11,
  BOOSTER = 12,
  HEADSURF = 13,
  BHOP = 14,
  MAXVEL = 15,
  FALL = 16,
  RAMPSTRAFE = 17,
  HEADCHECK = 18,
  STRAFE = 19,
  FLY = 20,
  SURF = 21,
  WEAPONS = 22,
  SPIKES = 23,
  SLOPES = 24,
  MISALIGNED_TELEPORTER = 25,
  CLIMB = 26,
  LADDER = 27,
  JUMPPAD = 28,
  HL2 = 29,
  SPEED_CONTROL = 30,
  DISPLACEMENTS = 31,
  PREC = 32,
  JUGGLE = 33,
  JUGGLEPREC = 34,
  HANDHELD = 35,
  SYNC = 36,
  WALLPOGO = 37,
  SPEEDSHOT = 38,
  BOUNCE = 39,
  BOUNCEHOP = 40,
  JURF = 41,
  EDGEBUG = 42,
  WALLSHOT = 43,
  PHASE = 44,
  PREFIRE = 45,
  BUTTONS = 46,
  LIMITED_AMMO = 47,
  WATER = 48,
  TELEDOOR = 49,
  AIRPOGO = 50,
  VERT = 51,
  ROLLERPOGO = 52,
  DOWNAIR = 53,
  SLANTED_WALLS = 54,
  AIR_JUMP = 55,
  ROCKET_LAUNCHER = 56,
  GRENADE_LAUNCHER = 57,
  PLASMA_GUN = 58,
  BFG = 59,
  COMBO = 60,
  HASTE = 61,
  DAMAGEBOOST = 62,
  TRICK = 63,
  SLICK = 64,
  TORTURE = 65,
  OVERBOUNCE = 66,
  LG_CLIMB = 67,
  ROCKET_STACK = 68,
  TELEHOP = 69,
  SLIDE = 70,
  LONGJUMP = 71,
  CEILINGSMASH = 72,
  CS_PRACTICE = 73,
  SINGLE_HOP = 74,
  HOLES = 75
}

const GLOBAL_TAGS = [
  MapTag.PORTALS,
  MapTag.MULTIROUTE,
  MapTag.LOW_GRAV,
  MapTag.GIMMICK,
  MapTag.ENDURANCE,
  MapTag.COLLECTIBLES,
  MapTag.ANTI_GRAV,
  MapTag.MOVING_SURFACES
];

const GAMEMODE_TAGS = {
  [GamemodeCategory.SURF]: [
    MapTag.UNIT,
    MapTag.TECH,
    MapTag.SPINS,
    MapTag.BOOSTER,
    MapTag.HEADSURF,
    MapTag.BHOP,
    MapTag.MAXVEL,
    MapTag.FALL,
    MapTag.RAMPSTRAFE,
    MapTag.HEADCHECK
  ] as const,
  [GamemodeCategory.BHOP]: [
    MapTag.STRAFE,
    MapTag.TECH,
    MapTag.FLY,
    MapTag.SURF,
    MapTag.WEAPONS,
    MapTag.SPINS,
    MapTag.SPIKES,
    MapTag.SLOPES,
    MapTag.MISALIGNED_TELEPORTER,
    MapTag.CLIMB,
    MapTag.LADDER,
    MapTag.JUMPPAD,
    MapTag.BOOSTER
  ] as const,
  [GamemodeCategory.CLIMB]: [
    MapTag.LADDER,
    MapTag.BHOP,
    MapTag.SLIDE,
    MapTag.LONGJUMP,
    MapTag.CEILINGSMASH,
    MapTag.CS_PRACTICE,
    MapTag.SINGLE_HOP
  ] as const,
  [GamemodeCategory.RJ]: [
    MapTag.SYNC,
    MapTag.WALLPOGO,
    MapTag.SPEEDSHOT,
    MapTag.BOUNCE,
    MapTag.BOUNCEHOP,
    MapTag.JURF,
    MapTag.EDGEBUG,
    MapTag.WALLSHOT,
    MapTag.PHASE,
    MapTag.PREFIRE,
    MapTag.BUTTONS,
    MapTag.LIMITED_AMMO,
    MapTag.WATER,
    MapTag.TELEDOOR
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
    'Teledoor',
    MapTag.HOLES
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
  ] as
} satisfies Record<GamemodeCategory, number[]>;
99999998089078901A2Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q32Q
// We could add support for individual subcategories (Gamemodes), but don't
// have a single example of one yet.

/**
 * Union of every possible tag in Momentum.
 */
// export type MapTag =
//   | (typeof GLOBAL_TAGS)[number]
//   | ElementOf<ValueOf<typeof GAMEMODE_TAGS>>;

export const MapTags: Map<Gamemode, MapTag[]> = new Map(
  // TODO: Spread unnecessary with TS 5.6 (i think) iterator methods
  [...GamemodeToGamemodeCategory.entries()].map(([gamemode, category]) => [
    gamemode,
    [...GLOBAL_TAGS, ...GAMEMODE_TAGS[category]].sort() // Alphabetical
  ])
);
