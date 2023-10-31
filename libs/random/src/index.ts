import { Enum, HeteroEnum } from '@momentum/enum';

export function chance(probabilityOfTrue = 0.5): boolean {
  return Math.random() < probabilityOfTrue;
}

export function int(max: number, min = 0): number {
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

export function element<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)];
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

export function enumKey<T extends HeteroEnum<T>>(enum_: T): keyof T {
  return element(Enum.keys(enum_)) as keyof T;
}

export function enumValue<T extends HeteroEnum<T>>(enum_: T): T[keyof T] {
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
  return [...arr]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}
