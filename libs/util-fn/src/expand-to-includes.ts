export interface ExpandToIncludesOptions<
  Expansions extends string[],
  ModelInclude extends object
> {
  /**
   * Strings to ignore
   */
  without?: Expansions[0][];
  /**
   * Strings include, omitting all others
   */
  only?: Expansions[0][];
  /**
   * Array of containing:
   *   - A string on the expand to map
   *   - A key into the Prisma include
   *   - A value to set the key to
   */
  mappings?: {
    [K in keyof ModelInclude]:
      | {
          expand: Expansions[0];
          model: K;
          value?: ModelInclude[K];
        }
      | {
          expand: K;
          value: ModelInclude[K];
        };
  }[keyof ModelInclude][];
}

/**
 * Transform an array of expansion strings into Prisma includes.
 *
 * Without `options`, just maps to an object containing each string as a key,
 * with `true` as its value, e.g:
 * `['a', 'b', 'c']` => `{ a: true, b: true, c: true}.`
 *
 * Strings in options.without will be ignored.
 *
 * Strings in options.only will be included, and all strings *not* in the array
 * will be omitted, if it's defined.
 *
 * `options.mappings` entries will replace a string `expand` in the expansions
 * with a Prisma include `value`, using `model` as the key. If `model` is
 * omitted, uses `expand`. If `value` is omitted, uses `true`. Note that
 * nappings are applied last, and can potentially overwrite an un-mapped expands.
 *
 * @example - returns `{ user: { include: { profile: true } }, userStats: true }`
 * expandToIncludes(['user', 'userWithProfile', 'stats', 'runs'], {
 *   without: ['runs'],
 *   mappings: [
 *     {
 *       expand: 'userWithProfile',
 *       model: 'user',
 *       value: { include: { profile: true } }
 *     },
 *     {
 *       expand: 'stats',
 *       model: 'userStats',
 *     }
 *   ]
 * });
 */
export function expandToIncludes<
  ModelInclude extends object,
  Expansions extends string[]
>(
  expansions?: Expansions,
  options?: ExpandToIncludesOptions<Expansions, ModelInclude>
): ModelInclude | undefined {
  if (!expansions || !Array.isArray(expansions) || expansions.length === 0)
    return undefined;

  const includes: Partial<ModelInclude> = {};

  for (const expansion of expansions) {
    if (
      (options?.without && options?.without.includes(expansion)) ||
      (options?.only && !options?.only.includes(expansion))
    ) {
      continue;
    }

    if (options?.mappings) {
      const mapping = options.mappings.find((x) => x.expand === expansion);
      if (mapping) {
        includes[
          (mapping as { expand: string; model: string }).model ?? expansion
        ] =
          mapping.value !== undefined
            ? mapping.value
            : // Suppress an "could be instantiated with an arbitrary type which
              // could be unrelated to `boolean`" TS error - `true` should
              // always be a valid `include` value to Prisma.
              (true as any);
      } else {
        includes[expansion] = true;
      }
    } else {
      includes[expansion] = true;
    }
  }

  return includes as ModelInclude;
}
