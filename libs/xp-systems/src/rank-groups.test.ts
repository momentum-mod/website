import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRankGroup, getRankGroupEnds } from './rank-groups';

describe('rank-groups', () => {
  describe('getRankGroupEnds', () => {
    it("should match KSF's group cutoffs on a large board (surf_shape)", () => {
      assert.deepEqual(getRankGroupEnds(1622), [43, 77, 144, 278, 547, 1084]);
    });

    it("should apply KSF's minimum ends on a small board (surf_infrared)", () => {
      assert.deepEqual(getRankGroupEnds(295), [20, 35, 60, 100, 150, 200]);
    });

    it('should be increasing for any board size', () => {
      for (const n of [0, 1, 11, 50, 300, 5000, 100_000]) {
        const ends = getRankGroupEnds(n);
        for (let i = 1; i < ends.length; i++) assert.ok(ends[i] > ends[i - 1]);
      }
    });
  });

  describe('getRankGroup', () => {
    it('should put no group on the top 10', () => {
      for (let rank = 1; rank <= 10; rank++)
        assert.equal(getRankGroup(rank, 1622), null);
    });

    it('should find the group and its rank range', () => {
      assert.deepEqual(getRankGroup(11, 1622), {
        group: 1,
        firstRank: 11,
        lastRank: 43
      });
      assert.deepEqual(getRankGroup(44, 1622), {
        group: 2,
        firstRank: 44,
        lastRank: 77
      });
      assert.deepEqual(getRankGroup(1084, 1622), {
        group: 6,
        firstRank: 548,
        lastRank: 1084
      });
    });

    it('should put no group past the last cutoff', () => {
      assert.equal(getRankGroup(1085, 1622), null);
      assert.equal(getRankGroup(1622, 1622), null);
    });

    it("should cap a group's last rank at the board size", () => {
      // 40 completions: group 1 is 11-20, group 2 would end at 35, group 3
      // at 60 but the board ends at 40.
      assert.deepEqual(getRankGroup(40, 40), {
        group: 3,
        firstRank: 36,
        lastRank: 40
      });
    });

    it('should ignore ranks beyond the board', () => {
      assert.equal(getRankGroup(41, 40), null);
    });
  });
});
