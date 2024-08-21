type StringKeyOf<T> = Extract<keyof T, string>;
export type HeteroEnum<T> = Record<StringKeyOf<T>, string | number>;
export type NumericEnum<T> = Record<StringKeyOf<T>, number>;
export type StringEnum<T> = Record<StringKeyOf<T>, string>;
export type Keys<T> = Array<StringKeyOf<T>>;
export type Values<T> = Array<T[StringKeyOf<T>]>;
export type Entries<T> = Array<[StringKeyOf<T>, T[StringKeyOf<T>]]>;

/**
 * Get the number of entries in an enum.
 * @param enumObj - Enum-like Object
 * @return number - The number of entries in the enum
 */
export function length<T extends HeteroEnum<T>>(enumObj: T) {
  return keys(enumObj).length;
}

/**
 * Faster version of `Enum.length` for numeric enums.
 * @param enumObj - Numeric enum-like Object
 * @return number - The number of entries in the enum
 */
export function fastLengthNumeric<T extends NumericEnum<T>>(
  enumObj: T
): number {
  // Typescript reverse mappings mean these have exactly twice as many keys
  // at runtime as a regular Object.
  return Object.keys(enumObj).length / 2;
}

/**
 * Faster version of `Enum.length` for string enums.
 * @param enumObj - String enum-like Object
 * @return number - The number of entries in the enum
 */
export function fastLengthString<T extends StringEnum<T>>(enumObj: T): number {
  return Object.keys(enumObj).length;
}

/**
 * Get the enum's keys, ignoring any reverse-mapped values.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function keys<T extends HeteroEnum<T>>(enumObj: T): Keys<T> {
  return getOwnEnumerableNonNumericKeys(enumObj) as Keys<T>;
}

/**
 * Faster version of `Enum.keys` for numeric enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastKeysNumeric<T extends NumericEnum<T>>(enumObj: T): Keys<T> {
  const keys = Object.keys(enumObj);
  return keys.slice(keys.length / 2) as Keys<T>;
}

/**
 * Faster version of `Enum.keys` for string enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastKeysString<T extends StringEnum<T>>(enumObj: T): Keys<T> {
  return Object.keys(enumObj) as Keys<T>;
}

/**
 * Get the enum's values.
 * NOTE: If there are duplicate values in the enum, then there will also
 * be duplicate values in the result.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's values
 */
export function values<T extends HeteroEnum<T>>(enumObj: T): Values<T> {
  return keys(enumObj).map((key) => enumObj[key]);
}

/**
 * Faster version of `Enum.keys` for numeric enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastValuesNumeric<T extends NumericEnum<T>>(
  enumObj: T
): Values<T> {
  const values = Object.values(enumObj);
  return values.slice(values.length / 2) as Values<T>;
}

/**
 * Faster version of `Enum.keys` for string enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastValuesString<T extends StringEnum<T>>(
  enumObj: T
): Values<T> {
  return Object.values(enumObj) as Values<T>;
}

/**
 * Get the enum's entries as [key, value] tuples.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's values
 */
export function entries<T extends HeteroEnum<T>>(enumObj: T): Entries<T> {
  return keys(enumObj).map((key) => [key, enumObj[key]]);
}

/**
 * Faster version of `Enum.keys` for numeric enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastEntriesNumeric<T extends NumericEnum<T>>(
  enumObj: T
): Entries<T> {
  const entries = Object.entries(enumObj);
  return entries.slice(entries.length / 2) as Entries<T>;
}

/**
 * Faster version of `Enum.keys` for string enums.
 * @param enumObj - Enum-like Object
 * @return An array of the enum's keys
 */
export function fastEntriesString<T extends StringEnum<T>>(
  enumObj: T
): Entries<T> {
  return Object.entries(enumObj) as Entries<T>;
}

/**
 * Return true if the specified object key value is NOT a numeric key.
 * @param key - An object key.
 * @return true if the specified object key value is NOT a numeric key.
 */
function isNonNumericKey(key: string): boolean {
  return (
    key !== String(Number.parseFloat(key)) ||
    // If you do this you're a psycho, but okay, this would be a bug otherwise
    key === 'NaN'
  );
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
