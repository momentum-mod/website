import { mock } from 'node:test';
import type { TestContext } from 'node:test';

const deepMockFunctions = new Set<any>();
const nextImplementationIndexes = new WeakMap<object, number>();
const mockFunctionTargets = new WeakMap<object, object>();

function createDeepMockFunction(): any {
  const fn = mock.fn();
  deepMockFunctions.add(fn);
  const values = new Map<PropertyKey, unknown>();

  const proxy = new Proxy(fn, {
    get(target, property, receiver) {
      if (property === 'mock') return target.mock;
      if (property === 'then') return;
      if (Reflect.has(target, property)) {
        return Reflect.get(target, property, receiver);
      }
      if (!values.has(property)) values.set(property, createDeepMockFunction());
      return values.get(property);
    }
  });
  mockFunctionTargets.set(proxy, fn);
  return proxy;
}

/**
 * Creates a lazy deep mock whose properties are mock functions.
 * The optional token documents the intended mocked type for callers.
 */
export function mockDeep<T = unknown>(_token?: unknown): T {
  const values = new Map<PropertyKey, unknown>();
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === 'then') return {};
        if (!values.has(property)) {
          values.set(property, createDeepMockFunction());
        }
        return values.get(property);
      }
    }
  ) as T;
}

/**
 * Clears recorded calls and queued-implementation positions for all deep mocks.
 */
export function resetDeepMockCalls(): void {
  for (const fn of deepMockFunctions) {
    resetMockCalls(fn);
  }
}

/**
 * Clears recorded calls and queued-implementation positions for the given mocks.
 *
 * Note this does *not* discard implementations queued with
 * `mockImplementationOnce` that were never consumed. Node keys those by call
 * index and `resetCalls()` leaves them in place, so after a reset they fire on
 * the matching call in a later test. Only queue them for calls that will
 * definitely happen.
 */
export function resetMockCalls(...functions: any[]): void {
  for (const fn of functions) {
    fn.mock.resetCalls();
    nextImplementationIndexes.delete(mockFunctionTargets.get(fn) ?? fn);
  }
}

/**
 * Queues an implementation for the next unhandled invocation of a mock function.
 */
export function mockImplementationOnce(
  fn: any,
  implementation: (...args: any[]) => any
): void {
  const target = mockFunctionTargets.get(fn) ?? fn;
  const callIndex = Math.max(
    fn.mock.calls.length,
    nextImplementationIndexes.get(target) ?? 0
  );
  fn.mock.mockImplementationOnce(implementation, callIndex);
  nextImplementationIndexes.set(target, callIndex + 1);
}

/**
 * Spies on a method synthesized by a nested proxy, similar to Jest's `spyOn`.
 * Node's `mock.method` expects a normal method property descriptor, which
 * Prisma's proxy-backed delegates do not provide, so this intercepts the
 * method through a forwarding proxy and restores the delegate after the test.
 */
export function spyOnNestedMethod<
  Owner extends object,
  Key extends keyof Owner
>(context: TestContext, owner: Owner, key: Key, method: PropertyKey) {
  const originalDelegate = owner[key];
  if (typeof originalDelegate !== 'object' || originalDelegate === null) {
    throw new TypeError(`Property ${String(key)} is not an object`);
  }

  const originalMethod = Reflect.get(originalDelegate, method);
  if (typeof originalMethod !== 'function') {
    throw new TypeError(`Property ${String(method)} is not a method`);
  }

  const methodMock = mock.fn(originalMethod);
  const mockedDelegate = new Proxy(originalDelegate, {
    get(target, property, receiver) {
      return property === method
        ? methodMock
        : Reflect.get(target, property, receiver);
    }
  });

  Object.defineProperty(owner, key, {
    configurable: true,
    value: mockedDelegate
  });
  context.after(() => {
    Object.defineProperty(owner, key, {
      configurable: true,
      value: originalDelegate
    });
  });

  return methodMock;
}
