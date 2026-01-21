/* eslint @typescript-eslint/naming-convention: 0 */
/**
 * Enum of all possible tags.
 *
 * Tags should *never* be removed - if we need to disable a tag in the
 * future, just remove it global tags and gamemode tags.
 *
 * Breaking naming convention, using casing that lets us translate to English
 * strings easily.
 *
 * - If tag name starts with a number, prefix it with `_Num`.
 * - If tag name contains a hyphen, use `__`
 *
 * For example, `_Num2__Way_Sym` becomes `2-Way Sym`.
 *
 * After adding tags, you need to run
 * ```
 * nx run scripts:maptags-poeditor
 * ```
 * which writes a JSON file to cwd, then import that file into POEditor, with
 * "Also import translations to a language" set to English. POEditor will not
 * overwrite existing translations.
 */
export enum MapTag {
  Portals = 1,
  Multiroute = 2,
  Low_Grav = 3,
  Gimmick = 4,
  Endurance = 5,
  Collectibles = 6,
  Anti_Grav = 7,
  Moving_Surfaces = 8,
  Unit = 9,
  Tech = 10,
  Spins = 11,
  Booster = 12,
  Headsurf = 13,
  Bhop = 14,
  Increased_Maxvel = 15,
  Fall = 16,
  Rampstrafe = 17,
  Headcheck = 18,
  Strafe = 19,
  Fly = 20,
  Surf = 21,
  Weapons = 22,
  Spikes = 23,
  Slopes = 24,
  Misaligned_Teleporters = 25,
  Climb = 26,
  Ladder = 27,
  Forced_Bhop = 28,
  HL2 = 29,
  Speed_Control = 30,
  Displacements = 31,
  Prec = 32,
  Juggle = 33,
  Juggleprec = 34,
  Handheld = 35,
  Sync = 36,
  Wallpogo = 37,
  Speedshot = 38,
  Bounce = 39,
  Bouncehop = 40,
  Jurf = 41,
  Edgebug = 42,
  Wallshot = 43,
  Phase = 44,
  Prefire = 45,
  Buttons = 46,
  Limited_Ammo = 47,
  Water = 48,
  Teledoor = 49,
  Airpogo = 50,
  Vert = 51,
  Rollerpogo = 52,
  Downair = 53,
  Slanted_Walls = 54,
  Air_Jump = 55,
  Rocket_Launcher = 56,
  Grenade_Launcher = 57,
  Plasma_Gun = 58,
  BFG = 59,
  Combo = 60,
  Haste = 61,
  Damageboost = 62,
  Trick = 63,
  Slick = 64,
  Torture = 65,
  Overbounce = 66,
  LG_Climb = 67,
  Rocket_Stack = 68,
  Telehop = 69,
  Slide = 70,
  Longjump = 71,
  Ceilingsmash = 72,
  CS_Practice = 73,
  Single_Hop = 74,
  Holes = 75,
  Angle_Snipe = 76,
  Low_Speed = 77,
  Fast_Paced = 78,
  Progressive_Difficulty = 79,
  Rocket_Spam = 80,
  Strafe_Pads = 81,
  Lightning_Gun = 82,
  _Num2__Way_Sym = 83,
  _Num4__Way_Sym = 84,
  Staged__Linear = 85,
  Funkyboost = 86,
  Mixed = 87,
  Pogo = 88,
  Gauntlet = 89,
  Flight = 90
}
