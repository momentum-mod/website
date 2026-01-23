/**
 * Utility type to ensure a map is complete for the given keys in some union
 * (usually an enum).
 *
 * If you're seeing an error around this, it means your map is missing at least
 * one of the keys in the union.
 *
 * TODO: Moving to strict mode might need some extra stuff, e.g. replace unknown
 * with generic and transform undefined to never?
 */
export type CompleteMap<Keys> = ReadonlyMap<Keys, unknown> & {
  // const stops type widening
  get<const T extends Keys>(gamemode: T): unknown;
};
