import { MapTag } from '../enums/map-tag.enum';
import {
  GamemodeCategory,
  GamemodeToGamemodeCategory
} from '../enums/gamemode.enum';

export const GlobalTags = [
  MapTag.Portals,
  MapTag.Multiroute,
  MapTag.Low_Grav,
  MapTag.Gimmick,
  MapTag.Endurance,
  MapTag.Collectibles,
  MapTag.Anti_Grav,
  MapTag.Moving_Surfaces,
  MapTag.Increased_Maxvel,
  MapTag.Progressive_Difficulty,
  MapTag.Mixed
];

export const GamemodeTags = {
  [GamemodeCategory.SURF]: [
    MapTag.Unit,
    MapTag.Tech,
    MapTag.Spins,
    MapTag.Booster,
    MapTag.Headsurf,
    MapTag.Bhop,
    MapTag.Fall,
    MapTag.Slide,
    MapTag.Rampstrafe,
    MapTag.Headcheck,
    MapTag.Angle_Snipe,
    MapTag.Low_Speed,
    MapTag.Fast_Paced,
    MapTag._Num2__Way_Sym,
    MapTag._Num4__Way_Sym,
    MapTag.Staged__Linear
  ],
  [GamemodeCategory.BHOP]: [
    MapTag.Strafe,
    MapTag.Tech,
    MapTag.Fly,
    MapTag.Surf,
    MapTag.Weapons,
    MapTag.Spins,
    MapTag.Spikes,
    MapTag.Slopes,
    MapTag.Misaligned_Teleporters,
    MapTag.Climb,
    MapTag.Booster,
    MapTag.Fast_Paced,
    MapTag.Forced_Bhop,
    MapTag.Ladder
  ],
  [GamemodeCategory.CLIMB]: [
    MapTag.Ladder,
    MapTag.Bhop,
    MapTag.Slide,
    MapTag.Longjump,
    MapTag.Ceilingsmash,
    MapTag.CS_Practice,
    MapTag.Single_Hop
  ],
  [GamemodeCategory.RJ]: [
    MapTag.Sync,
    MapTag.Wallpogo,
    MapTag.Speedshot,
    MapTag.Bounce,
    MapTag.Bouncehop,
    MapTag.Jurf,
    MapTag.Edgebug,
    MapTag.Wallshot,
    MapTag.Phase,
    MapTag.Prefire,
    MapTag.Buttons,
    MapTag.Limited_Ammo,
    MapTag.Water,
    MapTag.Teledoor,
    MapTag.Pogo
  ],
  [GamemodeCategory.SJ]: [
    MapTag.Airpogo,
    MapTag.Wallpogo,
    MapTag.Vert,
    MapTag.Limited_Ammo,
    MapTag.Phase,
    MapTag.Downair,
    MapTag.Slanted_Walls,
    MapTag.Teledoor,
    MapTag.Holes,
    MapTag.Pogo
  ],
  [GamemodeCategory.AHOP]: [
    MapTag.HL2,
    MapTag.Speed_Control,
    MapTag.Displacements,
    MapTag.Surf,
    MapTag.Low_Speed,
    MapTag.Fast_Paced
  ],
  [GamemodeCategory.CONC]: [
    MapTag.Prec,
    MapTag.Juggle,
    MapTag.Limited_Ammo,
    MapTag.Handheld,
    MapTag.Juggleprec
  ],
  [GamemodeCategory.DEFRAG]: [
    MapTag.Strafe,
    MapTag.Rocket_Launcher,
    MapTag.Grenade_Launcher,
    MapTag.Plasma_Gun,
    MapTag.BFG,
    MapTag.Combo,
    MapTag.Haste,
    MapTag.Damageboost,
    MapTag.Climb,
    MapTag.Trick,
    MapTag.Slick,
    MapTag.Torture,
    MapTag.Overbounce,
    MapTag.LG_Climb,
    MapTag.Rocket_Stack,
    MapTag.Buttons,
    MapTag.Air_Jump,
    MapTag.Rocket_Spam,
    MapTag.Strafe_Pads,
    MapTag.Lightning_Gun,
    MapTag.Staged__Linear,
    MapTag.Funkyboost,
    MapTag.Gauntlet,
    MapTag.Flight
  ]
} satisfies Record<GamemodeCategory, number[]>;

// We could add support for individual subcategories (Gamemodes), but don't
// have a single example of one yet.

/** Get the i18n token for a map tag */
export function mapTagToken(tag: MapTag): string {
  return 'MapTag_' + MapTag[tag];
}

/** Get the English name of a map tag */
export function mapTagEnglishName(tag: MapTag): string {
  return MapTag[tag].replace('__', '-').replace('_Num', '').replace('_', ' ');
}

export const MapTags = new Map(
  GamemodeToGamemodeCategory.entries().map(([gamemode, category]) => [
    gamemode,
    [...GlobalTags, ...GamemodeTags[category]].sort((a, b) =>
      // Lexicograpic sort by *ENGLISH* name - Panorama will want to sort by
      // localized names!
      MapTag[a] > MapTag[b] ? 1 : -1
    )
  ])
);
