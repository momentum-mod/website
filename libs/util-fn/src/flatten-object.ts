import { Primitive } from 'type-fest';
import { isObject } from './is-object';

function flattenRecursive(
  obj: object,
  depth: { counter: number; max: number }
): Record<string, Primitive | unknown[]> {
  if (depth.counter >= depth.max) {
    throw new Error('Max depth exceeded');
  } else {
    depth.counter++;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isObject(value)) {
      for (const [innerKey, innerValue] of Object.entries(
        flattenRecursive(value as Record<string, unknown>, depth)
      )) {
        result[`${key}.${innerKey}`] = innerValue;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Safely flattens a nested Object into a single Object, where values are either
 * primites or arrays.
 */
export function flattenObject(
  obj: object,
  maxDepth = 100
): Record<string, Primitive | unknown[]> {
  return flattenRecursive(obj, { counter: 1, max: maxDepth });
}
