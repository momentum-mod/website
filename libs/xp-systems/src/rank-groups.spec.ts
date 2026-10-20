import { getRankGroup, getRankGroupEnds } from './rank-groups';

describe('rank-groups', () => {
  describe('getRankGroupEnds', () => {
    it("matches KSF's group cutoffs on a large board (surf_shape)", () => {
      expect(getRankGroupEnds(1622)).toEqual([43, 77, 144, 278, 547, 1084]);
    });

    it("applies KSF's minimum ends on a small board (surf_infrared)", () => {
      expect(getRankGroupEnds(295)).toEqual([20, 35, 60, 100, 150, 200]);
    });

    it('is non-decreasing for any board size', () => {
      for (const n of [0, 1, 11, 50, 300, 5000, 100_000]) {
        const ends = getRankGroupEnds(n);
        for (let i = 1; i < ends.length; i++)
          expect(ends[i]).toBeGreaterThan(ends[i - 1]);
      }
    });
  });

  describe('getRankGroup', () => {
    it('puts no group on the top 10', () => {
      for (let rank = 1; rank <= 10; rank++)
        expect(getRankGroup(rank, 1622)).toBeNull();
    });

    it('finds the group and its rank range', () => {
      expect(getRankGroup(11, 1622)).toEqual({
        group: 1,
        firstRank: 11,
        lastRank: 43
      });
      expect(getRankGroup(44, 1622)).toEqual({
        group: 2,
        firstRank: 44,
        lastRank: 77
      });
      expect(getRankGroup(1084, 1622)).toEqual({
        group: 6,
        firstRank: 548,
        lastRank: 1084
      });
    });

    it('puts no group past the last cutoff', () => {
      expect(getRankGroup(1085, 1622)).toBeNull();
      expect(getRankGroup(1622, 1622)).toBeNull();
    });

    it("caps a group's last rank at the board size", () => {
      // 40 completions: group 1 is 11-20, group 2 would end at 35, group 3
      // at 60 but the board ends at 40.
      expect(getRankGroup(40, 40)).toEqual({
        group: 3,
        firstRank: 36,
        lastRank: 40
      });
    });

    it('ignores ranks beyond the board', () => {
      expect(getRankGroup(41, 40)).toBeNull();
    });
  });
});
