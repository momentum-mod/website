export type StringKeyOf<T> = Extract<keyof T, string>;
export type HeteroEnum<T> = Record<StringKeyOf<T>, string | number>;
export type NumericEnum<T> = Record<StringKeyOf<T>, number>;
export type StringEnum<T> = Record<StringKeyOf<T>, string>;

/**
 * Return true if the specified object key value is NOT a numeric key.
 * @param key - An object key.
 * @return true if the specified object key value is NOT a numeric key.
 */
function isNonNumericKey(key: string): boolean {
  return key !== String(Number.parseFloat(key));
}

/**
 * Get all own enumerable string (non-numeric) keys of an object.
 * The order of the result is guaranteed to be in the same order in which the
 * properties were added to the object, due to the specification of the
 * Object.getOwnPropertyNames method.
 * @param obj - An object.
 * @return A list of all the object's own enumerable string (non-numeric) keys.
 */
function getOwnEnumerableNonNumericKeys<T extends Record<string, any>>(
  obj: T
): StringKeyOf<T>[] {
  return Object.getOwnPropertyNames(obj).filter(
    (key) =>
      Object.prototype.propertyIsEnumerable.call(obj, key) &&
      isNonNumericKey(key)
  ) as StringKeyOf<T>[];
}

export const Enum = {
  /**
   * Get the number of entries in an enum.
   * @param enumObj - Enum-like Object
   * @return number - The number of entries in the enum
   */
  length: <T extends HeteroEnum<T>>(enumObj: T): number =>
    Enum.keys(enumObj).length,

  /**
   * Faster version of `Enum.length` for numeric enums.
   * @param enumObj - Numeric enum-like Object
   * @return number - The number of entries in the enum
   */
  fastLengthNumeric: <T extends NumericEnum<T>>(enumObj: T): number =>
    // Typescript reverse mappings mean these have exactly twice as many keys
    // at runtime as a regular Object.
    Object.keys(enumObj).length / 2,

  /**
   * Faster version of `Enum.length` for string enums.
   * @param enumObj - String enum-like Object
   * @return number - The number of entries in the enum
   */
  fastLengthString: <T extends StringEnum<T>>(enumObj: T): number =>
    Object.keys(enumObj).length,

  /**
   * Get the enum's keys, ignoring any reverse-mapped values.
   * @param enumObj - Enum-like Object
   * @return An array of the enum's keys
   */
  keys: <T extends HeteroEnum<T>>(enumObj: T): StringKeyOf<T>[] =>
    getOwnEnumerableNonNumericKeys(enumObj).filter(
      isNonNumericKey
    ) as StringKeyOf<T>[],

  /**
   * Get the enum's values.
   * NOTE: If there are duplicate values in the enum, then there will also
   * be duplicate values in the result.
   * @param enumObj - Enum-like Object
   * @return An array of the enum's values
   */
  values: <T extends HeteroEnum<T>>(enumObj: T): T[StringKeyOf<T>][] =>
    Enum.keys(enumObj).map((key) => enumObj[key]),

  /**
   * Get the enum's entries as [key, value] tuples.
   * @param enumObj - Enum-like Object
   * @return An array of the enum's values
   */
  entries: <T extends HeteroEnum<T>>(
    enumObj: T
  ): [StringKeyOf<T>, T[StringKeyOf<T>]][] =>
    Enum.keys(enumObj).map((key) => [key, enumObj[key]]),

  /**
   * Get an iterator for this enum's keys.
   * Iteration order is based on the original defined order of the enum.
   * @param enumObj - Enum-like Object
   * @return An iterator that iterates over the enum's keys.
   */
  iterKeys: <T extends HeteroEnum<T>>(
    enumObj: T
  ): IterableIterator<StringKeyOf<T>> => {
    const keysArray = Enum.keys(enumObj);
    let index = 0;

    return {
      next: () => {
        const result = {
          done: index >= keysArray.length,
          value: keysArray[index]
        } as IteratorResult<StringKeyOf<T>>;

        index++;

        return result;
      },

      [Symbol.iterator](): IterableIterator<StringKeyOf<T>> {
        return this;
      }
    };
  }

  // Could do iterValues, iterEntries, but doubt they'd be used.
};
