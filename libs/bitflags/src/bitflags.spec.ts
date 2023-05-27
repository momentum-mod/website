import { Bitflags } from './bitflags';

describe('Bitflags', () => {
  describe('has', () => {
    it('should return true if the flags contain the check value', () => {
      expect(Bitflags.has(0b0101, 0b0001)).toBe(true);
      expect(Bitflags.has(0b0101, 0b0100)).toBe(true);
    });

    it('should return false if the flags do not contain the check value', () => {
      expect(Bitflags.has(0b0101, 0b0010)).toBe(false);
      expect(Bitflags.has(0b0101, 0b1000)).toBe(false);
    });
  });

  describe('add', () => {
    it('should add the add value to the flags', () => {
      expect(Bitflags.add(0b0101, 0b0010)).toBe(0b0111);
      expect(Bitflags.add(0b0101, 0b1000)).toBe(0b1101);
    });
  });

  describe('remove', () => {
    it('should remove the remove value from the flags', () => {
      expect(Bitflags.remove(0b0101, 0b0001)).toBe(0b0100);
      expect(Bitflags.remove(0b0101, 0b0100)).toBe(0b0001);
    });
  });

  describe('toggle', () => {
    it('should toggle the toggle value in the flags', () => {
      expect(Bitflags.toggle(0b0101, 0b0010)).toBe(0b0111);
      expect(Bitflags.toggle(0b0111, 0b0010)).toBe(0b0101);
    });
  });

  describe('join', () => {
    it('should return the first argument when only one argument is passed', () => {
      expect(Bitflags.join(0b0001)).toBe(0b0001);
      expect(Bitflags.join(0b0011)).toBe(0b0011);
    });

    it('should return the bitwise OR of all arguments when multiple arguments are passed', () => {
      expect(Bitflags.join(0b0001, 0b0011)).toBe(0b11);
      expect(Bitflags.join(0b0001, 0b0010, 0b0100)).toBe(0b111);
      expect(Bitflags.join(0b0110, 0b0010, 0b0100)).toBe(0b110);
    });
  });
});
