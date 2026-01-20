import { Gamemode } from '../enums/gamemode.enum';
import { Style } from '../enums/style.enum';

const S = Style;
const G = Gamemode;

export const GamemodeStyles: ReadonlyMap<
  Gamemode,
  ReadonlySet<Style>
> = new Map(
  [
    [G.SURF, [S.NORMAL, S.SURF_HALF_SIDEWAYS, S.SIDEWAYS, S.BACKWARDS]],
    [G.BHOP, [S.NORMAL, S.BHOP_HALF_SIDEWAYS, S.SIDEWAYS, S.W_ONLY, S.AD_ONLY]],
    [G.BHOP_HL1, [S.NORMAL]],
    [G.CLIMB_MOM, [S.PRO, S.TELEPORT]],
    [G.CLIMB_KZT, [S.PRO, S.TELEPORT]],
    [G.CLIMB_16, [S.PRO, S.TELEPORT]],
    [G.RJ, [S.NORMAL]],
    [G.SJ, [S.NORMAL]],
    [G.AHOP, [S.NORMAL]],
    [G.CONC, [S.NORMAL]],
    [G.DEFRAG_CPM, [S.NORMAL]],
    [G.DEFRAG_VQ3, [S.NORMAL]],
    [G.DEFRAG_VTG, [S.NORMAL]]
  ].map(([k, v]) => [k as Gamemode, new Set((v as [Style | Style[]]).flat())])
);

export const GamemodeDefaultUIStyle: ReadonlyMap<Gamemode, Style> = new Map([
  [G.SURF, S.NORMAL],
  [G.BHOP, S.NORMAL],
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
]);
