/**
 * Utility functions for random stuff
 */
export const Random = {
    bool: (): boolean => Math.random() < 0.5,

    weightedBool: (probabilityOfTrue): boolean => Math.random() < probabilityOfTrue,

    int: (max: number, min = 0): number => Math.floor(Math.random() * (max - min + 1) + min),

    float: (max: number, min = 0, decimalPlaces?: number): number => {
        const float = Math.random() * (max - min) + min;
        return typeof decimalPlaces != 'undefined'
            ? float
            : Number.parseFloat((Math.random() * (max - min) + min).toFixed(decimalPlaces));
    },

    element: <T>(array: readonly T[]): T => array[Math.floor(Math.random() * array.length)],

    enumKey: <T>(enum_: T): keyof T =>
        Random.element(Object.keys(enum_).filter((key) => !(Math.abs(Number.parseInt(key)) + 1))) as keyof T,

    enumValue: <T>(enum_: T): T[keyof T] => enum_[Random.enumKey(enum_)],

    date: (start: Date | number, end: Date | number, startHour = 0, endHour = 24): Date => {
        if (typeof start != 'number') start = +start;
        if (typeof end != 'number') end = +start;
        const date = new Date(start + Math.random() * (end - start));
        date.setHours(Random.int(startHour, endHour));
        return date;
    },

    pastDateInYears: (years = 1): Date => Random.date(Date.now() - years * 31_536_000, Date.now()),

    pastDateSince: (refDate: Date | number): Date =>
        Random.date(typeof refDate != 'number' ? +refDate : refDate, Date.now()),

    createdUpdatedDates: (startDateYearsBack?: number): { createdAt: Date; updatedAt: Date } => {
        const createdAtDate = Random.pastDateInYears(startDateYearsBack);
        return {
            createdAt: createdAtDate,
            updatedAt: Random.date(createdAtDate, Date.now())
        };
    }
};
