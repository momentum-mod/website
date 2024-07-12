import { Bitfield } from '@momentum/constants';

type InferBitfield<T extends number> =
  T extends Bitfield<infer U> ? Bitfield<U> : number;

export function has<T extends number>(
  flags: InferBitfield<T>,
  check: number
): boolean {
  // eslint-disable-next-line eqeqeq
  return (flags & check) != 0;
}

export function add<T extends number>(flags: InferBitfield<T>, add: number): T {
  return (flags | add) as T;
}

export function remove<T extends number>(
  flags: InferBitfield<T>,
  remove: number
): T {
  return (flags & ~remove) as T;
}

export function toggle<T extends number>(
  flags: InferBitfield<T>,
  toggle: number
): T {
  return (flags ^ toggle) as T;
}

export function join<T extends number>(...flags: InferBitfield<T>[]): T {
  return flags.reduce((sum, current) => sum | current, 0 as number) as T;
}
