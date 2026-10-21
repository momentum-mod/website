import * as assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

export function includesPartial(
  actual: readonly unknown[],
  expected: readonly unknown[]
): boolean {
  return expected.every((expectedItem) =>
    actual.some((actualItem) => matchesPartial(actualItem, expectedItem))
  );
}

const ASYMMETRIC_MATCHER = Symbol('asymmetricMatcher');
type Constructor =
  | (abstract new (...args: never[]) => object)
  | NumberConstructor
  | StringConstructor
  | BooleanConstructor
  | BigIntConstructor
  | SymbolConstructor;

export function arrayContaining(expected: readonly unknown[]) {
  return asymmetricMatcher('arrayContaining', expected);
}

export function objectContaining(expected: unknown) {
  return asymmetricMatcher('objectContaining', expected);
}

export function any(expectedType: Constructor) {
  return asymmetricMatcher('any', expectedType);
}

export function anything() {
  return asymmetricMatcher('anything');
}

export function stringContaining(expected: string) {
  return asymmetricMatcher('stringContaining', expected);
}

export function stringMatching(expected: RegExp) {
  return asymmetricMatcher('stringMatching', expected);
}

/**
 * Recursive partial match, like Jest's `toMatchObject`: objects in `expected`
 * only need to be a subset of `actual` (inherited properties such as prototype
 * getters count), whilst arrays must match in length.
 */
export function matchesPartial(actual: unknown, expected: unknown): boolean {
  if (isAsymmetricMatcher(expected)) {
    return matchesAsymmetric(actual, expected);
  }

  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matchesPartial(actual[index], item))
    );
  }

  if (isPlainObject(expected)) {
    if (!isObject(actual)) return false;
    return Reflect.ownKeys(expected).every(
      (key) =>
        key in actual &&
        matchesPartial(actual[key as keyof typeof actual], expected[key])
    );
  }

  try {
    assert.partialDeepStrictEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursive exact match, like Jest's `toEqual`: objects must have the same
 * set of keys (ignoring those with `undefined` values) and arrays must match in
 * length. Asymmetric matchers such as `objectContaining` can be nested to
 * relax this for specific values.
 */
export function matchesExact(actual: unknown, expected: unknown): boolean {
  if (isAsymmetricMatcher(expected)) {
    return matchesAsymmetric(actual, expected);
  }

  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matchesExact(actual[index], item))
    );
  }

  if (isPlainObject(expected)) {
    if (!isObject(actual) || Array.isArray(actual)) return false;
    const expectedKeys = definedKeys(expected);
    const actualKeys = definedKeys(actual);
    return (
      expectedKeys.length === actualKeys.length &&
      expectedKeys.every(
        (key) =>
          Object.hasOwn(actual, key) && matchesExact(actual[key], expected[key])
      )
    );
  }

  return isDeepStrictEqual(actual, expected);
}

function matchesAsymmetric(
  actual: unknown,
  matcher: { [ASYMMETRIC_MATCHER]: { kind: string; expected?: unknown } }
): boolean {
  const { kind, expected } = matcher[ASYMMETRIC_MATCHER];
  switch (kind) {
    case 'arrayContaining':
      return (
        Array.isArray(actual) &&
        includesPartial(actual, expected as readonly unknown[])
      );
    case 'objectContaining':
      return matchesPartial(actual, expected);
    case 'anything':
      return actual !== null && actual !== undefined;
    case 'any':
      return matchesType(actual, expected as Constructor);
    case 'stringContaining':
      return typeof actual === 'string' && actual.includes(expected as string);
    case 'stringMatching':
      return (
        typeof actual === 'string' &&
        new RegExp(
          (expected as RegExp).source,
          (expected as RegExp).flags
        ).test(actual)
      );
    default:
      throw new Error(`Unknown asymmetric matcher ${kind}`);
  }
}

function definedKeys(value: Record<PropertyKey, unknown>): PropertyKey[] {
  return Reflect.ownKeys(value).filter(
    (key) =>
      Object.prototype.propertyIsEnumerable.call(value, key) &&
      value[key] !== undefined
  );
}

function asymmetricMatcher(kind: string, expected?: unknown) {
  return { [ASYMMETRIC_MATCHER]: { kind, expected } };
}

function isAsymmetricMatcher(value: unknown): value is {
  [ASYMMETRIC_MATCHER]: { kind: string; expected?: unknown };
} {
  return (
    typeof value === 'object' && value !== null && ASYMMETRIC_MATCHER in value
  );
}

function matchesType(actual: unknown, expectedType: Constructor): boolean {
  switch (expectedType) {
    case Number:
      return typeof actual === 'number' || actual instanceof Number;
    case String:
      return typeof actual === 'string' || actual instanceof String;
    case Boolean:
      return typeof actual === 'boolean' || actual instanceof Boolean;
    case BigInt:
      return typeof actual === 'bigint';
    case Symbol:
      return typeof actual === 'symbol';
    default:
      return (
        actual !== null &&
        (typeof actual === 'object' || typeof actual === 'function') &&
        actual instanceof expectedType
      );
  }
}

function isPlainObject(value: unknown): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Whether any call to the mock exactly matched the given arguments, like Jest's
 * `toHaveBeenCalledWith`. Use `objectContaining` etc. for partial arguments.
 */
export function wasCalledWith(
  mockFunction: any,
  ...expected: unknown[]
): boolean {
  return mockFunction.mock.calls.some(({ arguments: actual }: any) =>
    matchesExact(actual, expected)
  );
}
