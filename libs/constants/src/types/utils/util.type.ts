/**
 * Trivial types that are useful in many places.
 * This package is exported to Panorama, which doesn't support type-fest, add
 * here if needed.
 */

export type ValueOf<T> = T[keyof T];
export type ElementOf<T> = T extends (infer E)[] ? E : never;

export type KeyOfMap<T> = T extends Map<infer K, any> ? K : never;
export type ValueOfMap<T> = T extends Map<any, infer V> ? V : never;

export type ElementOfSet<T> = T extends Set<infer K> ? K : never;
