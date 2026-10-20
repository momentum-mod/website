import * as assert from 'node:assert/strict';

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

export function matchesPartial(actual: unknown, expected: unknown): boolean {
  if (isAsymmetricMatcher(expected)) {
    const { kind, expected: matcherExpected } = expected[ASYMMETRIC_MATCHER];
    switch (kind) {
      case 'arrayContaining':
        return (
          Array.isArray(actual) &&
          includesPartial(actual, matcherExpected as readonly unknown[])
        );
      case 'objectContaining':
        return matchesPartial(actual, matcherExpected);
      case 'anything':
        return actual !== null && actual !== undefined;
      case 'any':
        return matchesType(actual, matcherExpected as Constructor);
      case 'stringContaining':
        return (
          typeof actual === 'string' &&
          actual.includes(matcherExpected as string)
        );
      case 'stringMatching':
        return (
          typeof actual === 'string' &&
          new RegExp(
            (matcherExpected as RegExp).source,
            (matcherExpected as RegExp).flags
          ).test(actual)
        );
    }
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
        Object.hasOwn(actual, key) &&
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

export function wasCalledWith(
  mockFunction: any,
  ...expected: unknown[]
): boolean {
  return mockFunction.mock.calls.some(({ arguments: actual }: any) =>
    matchesPartial(actual, expected)
  );
}
