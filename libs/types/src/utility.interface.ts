/**
 * Utility type to allow implementations of Prisma models to treat their `bigint` properties as `number`s.
 *
 * Excludes properties with key Exclude.
 *
 * Combined with NumberifyBigInt transformer to ensure we handle them safely.
 */
export type NumberifyBigInt<
  Model extends Record<string, any>,
  Exclude extends string | void = void
> = {
  [K in keyof Model]: K extends Exclude
    ? Model[K] // If excluded, do nothing
    : Model[K] extends bigint
    ? number // Replace bigint with number
    : Model[K] extends bigint | null
    ? number | null // Replace nullable bigint with nullable bigint
    : Model[K];
};
