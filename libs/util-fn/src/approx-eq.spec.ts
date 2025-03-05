import { approxEq } from './approx-eq';

describe('approxEq', () => {
  it('returns true for numbers within the default threshold', () => {
    expect(approxEq(1.0000001, 1.0000002)).toBe(true);
  });

  it('returns false for numbers outside the default threshold', () => {
    expect(approxEq(1.000001, 1.00001)).toBe(false);
  });

  it('returns true for numbers within a custom threshold', () => {
    expect(approxEq(1.0001, 1.0002, 0.001)).toBe(true);
  });

  it('returns false for numbers outside a custom threshold', () => {
    expect(approxEq(1.0001, 1.0002, 0.00001)).toBe(false);
  });

  it('returns true for identical numbers', () => {
    expect(approxEq(1, 1)).toBe(true);
  });
});
