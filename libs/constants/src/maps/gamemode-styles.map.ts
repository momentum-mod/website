import { Gamemode, Style } from '../';

const S = Style;
const G = Gamemode;

export const GamemodeStyles: ReadonlyMap<
  Gamemode,
  ReadonlySet<Style>
> = new Map(
  [
    [G.SURF, [S.NORMAL, S.HALF_SIDEWAYS, S.SIDEWAYS]],
    [G.BHOP, [S.NORMAL, S.HALF_SIDEWAYS, S.SIDEWAYS, S.W_ONLY, S.AD_ONLY]],
    [G.BHOP_HL1, [S.NORMAL]],
    [G.CLIMB_MOM, [S.NORMAL, S.NO_TELEPORT]],
    [G.CLIMB_KZT, [S.NORMAL, S.NO_TELEPORT]],
    [G.CLIMB_16, [S.NORMAL, S.NO_TELEPORT]],
    [G.RJ, [S.NORMAL]],
    [G.SJ, [S.NORMAL]],
    [G.AHOP, [S.NORMAL]],
    [G.CONC, [S.NORMAL]],
    [G.DEFRAG_CPM, [S.NORMAL]],
    [G.DEFRAG_VQ3, [S.NORMAL]],
    [G.DEFRAG_VTG, [S.NORMAL]]
  ].map(([k, v]) => [k as Gamemode, new Set((v as [Style | Style[]]).flat())])
);
