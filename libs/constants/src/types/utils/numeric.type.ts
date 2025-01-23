export type uint8 = number;
export type uint16 = number;
export type uint32 = number;
export type uint64 = bigint;
export type int8 = number;
export type int16 = number;
export type int32 = number;
export type int64 = bigint;

/**
 * Denotes a 32-bit IEEE floating point number, note all JS numbers are still
 * 64-bit (doubles) at runtime! Take care to use Math.fround when comparing.
 */
export type float = number;
export type double = number;

export type vec2 = { x: number; y: number };
export type vec3 = { x: number; y: number; z: number };
