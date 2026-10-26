import { Gamemode } from '../enums/gamemode.enum';
import { Style } from '../enums/style.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

const S = Style;
const G = Gamemode;

// prettier-ignore
export const GamemodeStyles: ReadonlyMap<Gamemode, ReadonlySet<Style>> = new Map([
  [G.SURF,        new Set([S.NORMAL, S.SURF_HALF_SIDEWAYS, S.SIDEWAYS, S.BACKWARDS])],
  [G.BHOP,        new Set([S.NORMAL, S.BHOP_HALF_SIDEWAYS, S.SIDEWAYS, S.W_ONLY, S.AD_ONLY])],
  [G.BHOP_STAMINA, new Set([S.BUFFERED_JUMP, S.SCROLL, S._400VELBUFFERED, S._400VELSCROLL])],
  [G.BHOP_HL1,    new Set([S.NORMAL])],
  [G.CLIMB_MOM,   new Set([S.PRO, S.TELEPORT])],
  [G.CLIMB_KZT,   new Set([S.PRO, S.TELEPORT])],
  [G.CLIMB_16,    new Set([S.PRO, S.TELEPORT])],
  [G.RJ,          new Set([S.NORMAL])],
  [G.SJ,          new Set([S.NORMAL])],
  [G.AHOP,        new Set([S.NORMAL])],
  [G.CONC,        new Set([S.NORMAL])],
  [G.DEFRAG_CPM,  new Set([S.NORMAL])],
  [G.DEFRAG_VQ3,  new Set([S.NORMAL])],
  [G.DEFRAG_VTG,  new Set([S.NORMAL])]
]) satisfies CompleteMap<Gamemode>;

export const GamemodeDefaultUIStyle: ReadonlyMap<Gamemode, Style> = new Map([
  [G.SURF, S.NORMAL],
  [G.BHOP, S.NORMAL],
  [G.BHOP_STAMINA, S.NORMAL],
  [G.BHOP_HL1, S.NORMAL],
  [G.CLIMB_MOM, S.TELEPORT],
  [G.CLIMB_KZT, S.TELEPORT],
  [G.CLIMB_16, S.PRO],
  [G.RJ, S.NORMAL],
  [G.SJ, S.NORMAL],
  [G.AHOP, S.NORMAL],
  [G.CONC, S.NORMAL],
  [G.DEFRAG_CPM, S.NORMAL],
  [G.DEFRAG_VQ3, S.NORMAL],
  [G.DEFRAG_VTG, S.NORMAL]
]) satisfies CompleteMap<Gamemode>;
