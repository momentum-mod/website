import * as assert from 'node:assert/strict';

export function includesPartial(
  actual: readonly unknown[],
  expected: readonly unknown[]
): boolean {
  return expected.every((expectedItem) =>
    actual.some((actualItem) => matchesPartial(actualItem, expectedItem))
  );
}

export function matchesPartial(actual: unknown, expected: unknown): boolean {
  try {
    assert.partialDeepStrictEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

export function wasCalledWith(
  mockFunction: any,
  ...expected: unknown[]
): boolean {
  return mockFunction.mock.calls.some(({ arguments: actual }: any) =>
    matchesPartial(actual, expected)
  );
}
