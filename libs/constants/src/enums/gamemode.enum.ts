/**
 * All the modes available in Momentum.
 */
export enum Gamemode {
  SURF = 1,
  BHOP = 2,
  BHOP_HL1 = 3,
  CLIMB_MOM = 4,
  CLIMB_KZT = 5,
  CLIMB_16 = 6,
  RJ = 7,
  SJ = 8,
  AHOP = 9,
  CONC = 10,
  DEFRAG_CPM = 11,
  DEFRAG_VQ3 = 12,
  DEFRAG_VTG = 13
}

/**
 * The outer categories that gamemodes are grouped into.
 */
export enum GamemodeCategory {
  SURF = 1,
  BHOP = 2,
  CLIMB = 3,
  RJ = 4,
  SJ = 5,
  AHOP = 6,
  CONC = 7,
  DEFRAG = 8
}

// prettier-ignore
export const GamemodeCategoryToGamemode = new Map<GamemodeCategory, Gamemode[]>([
  [GamemodeCategory.SURF,     [Gamemode.SURF]],
  [GamemodeCategory.BHOP,     [Gamemode.BHOP, Gamemode.BHOP_HL1]],
  [GamemodeCategory.CLIMB,    [Gamemode.CLIMB_MOM, Gamemode.CLIMB_KZT, Gamemode.CLIMB_16]],
  [GamemodeCategory.RJ,       [Gamemode.RJ]],
  [GamemodeCategory.SJ,       [Gamemode.SJ]],
  [GamemodeCategory.AHOP,     [Gamemode.AHOP]],
  [GamemodeCategory.CONC,     [Gamemode.CONC]],
  [GamemodeCategory.DEFRAG,   [Gamemode.DEFRAG_CPM, Gamemode.DEFRAG_VQ3, Gamemode.DEFRAG_VTG]]
]);

// prettier-ignore
export const GamemodeToGamemodeCategory = new Map<Gamemode, GamemodeCategory>([
  [Gamemode.SURF,           GamemodeCategory.SURF],
  [Gamemode.BHOP,           GamemodeCategory.BHOP],
  [Gamemode.BHOP_HL1,       GamemodeCategory.BHOP],
  [Gamemode.CLIMB_MOM,      GamemodeCategory.CLIMB],
  [Gamemode.CLIMB_KZT,      GamemodeCategory.CLIMB],
  [Gamemode.CLIMB_16,       GamemodeCategory.CLIMB],
  [Gamemode.RJ,             GamemodeCategory.RJ],
  [Gamemode.SJ,             GamemodeCategory.SJ],
  [Gamemode.AHOP,           GamemodeCategory.AHOP],
  [Gamemode.CONC,           GamemodeCategory.CONC],
  [Gamemode.DEFRAG_CPM,     GamemodeCategory.DEFRAG],
  [Gamemode.DEFRAG_VQ3,     GamemodeCategory.DEFRAG],
  [Gamemode.DEFRAG_VTG,     GamemodeCategory.DEFRAG]
]);
