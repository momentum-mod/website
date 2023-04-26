/**
 * Utility type to allow implementations of Prisma models to treat their `bigint` properties as `number`s.
 *
 * Excludes properties with key TExclude.
 *
 * Combined with NumberifyBigInt transformer to ensure we handle them safely.
 */
export type PrismaModelToDto<
  TModel extends Record<string, any>,
  TExclude extends string | void = void
> = {
  [K in keyof TModel]: TModel[K] extends bigint
    ? K extends TExclude
      ? bigint
      : number
    : TModel[K] extends object
    ? PrismaModelToDto<TModel[K], TExclude>
    : TModel[K];
};
