import * as Enum from '@momentum/enum';

export function chance(probabilityOfTrue = 0.5): boolean {
  return Math.random() < probabilityOfTrue;
}

export function int(max: number): number;
export function int(min: number, max: number): number;
export function int(max: number, min = 0): number {
  if (min > max) {
    [max, min] = [min, max];
  }

  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function float(max: number, min = 0, decimalPlaces?: number): number {
  const float = Math.random() * (max - min) + min;
  return decimalPlaces !== undefined
    ? float
    : Number.parseFloat(
        (Math.random() * (max - min) + min).toFixed(decimalPlaces)
      );
}

export function char(
  min = 'a'.codePointAt(0)!,
  max = 'z'.codePointAt(0)!
): string {
  return String.fromCodePoint(int(max, min));
}

export function element<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function uniquePair<T>(
  array: readonly T[],
  identityFn = (a: T, b: T): boolean => a === b
): [T, T] {
  if (array.length < 2)
    throw new Error('uniquePair called with a array size 1 (dont do that lol)');
  const first = element(array);
  let second;
  while (identityFn(first, (second = element(array))));
  return [first, second];
}

export function uniquePairs<T>(
  array: readonly T[],
  count: number,
  identityFn = (a: T[], b: T[]): boolean => a[0] === b[0] && a[1] === b[1]
): [T, T][] {
  const n = array.length;
  if (count > (n * (n - 1)) / 2)
    throw new Error('Array contains fewer possible pairs than count requested');

  const out: [T, T][] = [];
  while (out.length < count) {
    const pair = uniquePair(array);
    // This is stupidly slow for small arrays relative to count, only use for tests/tools
    if (!out.some((pair2) => identityFn(pair, pair2))) {
      out.push(pair);
    }
  }
  return out;
}

export function weighted<T>(choices: [T, number][]): T {
  const len = choices.length;
  const summedWeights = [choices[0][1]];

  for (let i = 1; i < len; i++) {
    summedWeights[i] = summedWeights[i - 1] + choices[i][1];
  }

  const random = Math.random() * summedWeights[len - 1];

  let i;
  for (i = 0; i < len; i++) {
    if (summedWeights[i] > random) {
      break;
    }
  }

  return choices[i][0];
}

export function enumKey<T extends Enum.HeteroEnum<T>>(enum_: T): keyof T {
  return element(Enum.keys(enum_)) as keyof T;
}

export function enumValue<T extends Enum.HeteroEnum<T>>(enum_: T): T[keyof T] {
  return enum_[enumKey(enum_)];
}

export function date(
  start: Date | number,
  end: Date | number,
  startHour = 0,
  endHour = 24
): Date {
  if (typeof start != 'number') start = +start;
  if (typeof end != 'number') end = +start;
  const date = new Date(start + Math.random() * (end - start));
  date.setHours(int(startHour, endHour));
  return date;
}

export function pastDateInYears(years = 1): Date {
  return date(Date.now() - years * 31_536_000, Date.now());
}

export function pastDateSince(refDate: Date | number): Date {
  return date(typeof refDate != 'number' ? +refDate : refDate, Date.now());
}

export function createdUpdatedDates(startDateYearsBack?: number): {
  createdAt: Date;
  updatedAt: Date;
} {
  const createdAtDate = pastDateInYears(startDateYearsBack);
  return {
    createdAt: createdAtDate,
    updatedAt: date(createdAtDate, Date.now())
  };
}

export function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}
