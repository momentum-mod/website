import { Vector, Vector2D } from '@momentum/constants';

export const Vec = {
  add: <V extends Vector | Vector2D>(v1: V, v2: V): V =>
    (v1.length === 2
      ? [v1[0] + v2[0], v1[1] + v2[1]]
      : [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]]) as V, // Can't be bothered to fix "could be instantiated with different subtype" crap here.

  sub: <V extends Vector | Vector2D>(v1: V, v2: V): V =>
    (v1.length === 2
      ? [v1[0] - v2[0], v1[1] - v2[1]]
      : [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]]) as V,

  len(vec: Vector | Vector2D): number {
    return Math.hypot(...vec);
  },

  dot: <V extends Vector | Vector2D>(v1: V, v2: V): number =>
    v1.length === 2
      ? v1[0] * v2[0] + v1[1] * v2[1]
      : v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2],

  /**
   * Get the orientation between three points
   * Returns -1 for CCW, 1 for CW, 0 for colinear
   */
  ccw([Ax, Ay]: Vector2D, [Bx, By]: Vector2D, [Cx, Cy]: Vector2D): -1 | 0 | 1 {
    const val = (Cy - Ay) * (Bx - Ax) - (By - Ay) * (Cx - Ax);
    if (val < 0) return -1;
    else if (val > 0) return 1;
    return 0;
  }
};
