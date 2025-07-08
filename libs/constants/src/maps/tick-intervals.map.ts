import { Gamemode } from '../enums/gamemode.enum';
import { float } from '../types/utils/numeric.type';

/**
 * The tick intervals (inverse of tickrate) each gamemode uses. In Source
 * they're floats (32-bit), so take care to use f32 rounded values in JS.
 *
 * @see (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround)
 *
 * | Tick Rate | Tick Interval |
 * |-----------|---------------|
 * | 66        | 0.015         |
 * | 100       | 0.01          |
 * | 125       | 0.008         |
 * | 128       | 0.0078125     |
 */
// prettier-ignore
export const TickIntervals: ReadonlyMap<Gamemode, float> = new Map([
  [Gamemode.AHOP,           Math.fround(0.015)],
  [Gamemode.BHOP,           Math.fround(0.01)],
  [Gamemode.BHOP_HL1,       Math.fround(0.01)],
  [Gamemode.CLIMB_MOM,      Math.fround(0.01)],
  [Gamemode.CLIMB_KZT,      Math.fround(0.01)],
  [Gamemode.CLIMB_16,       Math.fround(0.01)],
  [Gamemode.CONC,           Math.fround(0.01)],
  [Gamemode.DEFRAG_CPM,     Math.fround(0.008)],
  [Gamemode.DEFRAG_VQ3,     Math.fround(0.008)],
  [Gamemode.DEFRAG_VTG,     Math.fround(0.008)],
  [Gamemode.RJ,             Math.fround(0.015)],
  [Gamemode.SJ,             Math.fround(0.015)],
  [Gamemode.SURF,           Math.fround(0.015)]
]);
