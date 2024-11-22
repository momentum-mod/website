import { magic } from './magic';

describe('magic', () => {
  it('should return the correct magic number for a valid 4-character string', () => {
    expect(magic('SPAM')).toBe(1296126035);
  });

  it('should return -1 for a string shorter than 4 characters', () => {
    expect(magic('SPA')).toBe(-1);
  });

  it('should return -1 for a string longer than 4 characters', () => {
    expect(magic('SPAMF')).toBe(-1);
  });
});
