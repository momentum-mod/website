/**
 * Alias to distinguish a number supposed to represent a bit field.
 */
export type Flags<T extends number | undefined = undefined> = T extends void
  ? number
  : number & { __brand: T };
