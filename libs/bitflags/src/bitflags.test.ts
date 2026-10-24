import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { has, join, toggle, remove, add } from './bitflags';

describe('Bitflags', () => {
  describe('has', () => {
    it('should return true if the flags contain the check value', () => {
      assert.equal(has(0b0101, 0b0001), true);
      assert.equal(has(0b0101, 0b0100), true);
    });

    it('should return false if the flags do not contain the check value', () => {
      assert.equal(has(0b0101, 0b0010), false);
      assert.equal(has(0b0101, 0b1000), false);
    });
  });

  describe('add', () => {
    it('should add the add value to the flags', () => {
      assert.equal(add(0b0101, 0b0010), 0b0111);
      assert.equal(add(0b0101, 0b1000), 0b1101);
    });
  });

  describe('remove', () => {
    it('should remove the remove value from the flags', () => {
      assert.equal(remove(0b0101, 0b0001), 0b0100);
      assert.equal(remove(0b0101, 0b0100), 0b0001);
    });
  });

  describe('toggle', () => {
    it('should toggle the toggle value in the flags', () => {
      assert.equal(toggle(0b0101, 0b0010), 0b0111);
      assert.equal(toggle(0b0111, 0b0010), 0b0101);
    });
  });

  describe('join', () => {
    it('should return the first argument when only one argument is passed', () => {
      assert.equal(join(0b0001), 0b0001);
      assert.equal(join(0b0011), 0b0011);
    });

    it('should return the bitwise OR of all arguments when multiple arguments are passed', () => {
      assert.equal(join(0b0001, 0b0011), 0b11);
      assert.equal(join(0b0001, 0b0010, 0b0100), 0b111);
      assert.equal(join(0b0110, 0b0010, 0b0100), 0b110);
    });
  });
});
