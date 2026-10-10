import { TrackType } from '@momentum/constants';
import {
  BONUS_POOL_FRACTION,
  getCompletionAward,
  getRankPoints,
  getRankPointsBreakdown,
  getRankShare,
  getTierMultiplier,
  getTrackWeight,
  RANK_POINTS_PARAMS,
  STAGE_POOL_FRACTION
} from './rank-points';

describe('rank-points', () => {
  describe('getTierMultiplier', () => {
    it('is 1 at tier 1 and grows geometrically', () => {
      expect(getTierMultiplier(1)).toBe(1);
      expect(getTierMultiplier(2)).toBeCloseTo(1.293, 3);
      expect(getTierMultiplier(10)).toBeCloseTo(10.1, 1);
    });
  });

  describe('getRankShare', () => {
    it('is exactly 1 at rank 1 and exactly 0 at last place for any N', () => {
      for (const n of [2, 10, 100, 2000, 17_291]) {
        expect(getRankShare(1, n)).toBe(1);
        expect(getRankShare(n, n)).toBe(0);
      }
    });

    it('gives a solo board the full share', () => {
      expect(getRankShare(1, 1)).toBe(1);
    });

    it('matches the design document table at γ = 0.20', () => {
      // Rank 10 on various board sizes
      expect(getRankShare(10, 100)).toBeCloseTo(0.387, 3);
      expect(getRankShare(10, 2000)).toBeCloseTo(0.528, 3);
      expect(getRankShare(10, 17_291)).toBeCloseTo(0.57, 3);
      // Rank 2 of 10
      expect(getRankShare(2, 10)).toBeCloseTo(0.649, 3);
      // Rank 1000 of 17291
      expect(getRankShare(1000, 17_291)).toBeCloseTo(0.127, 3);
    });

    it('is strictly decreasing in rank', () => {
      const n = 500;
      let prev = getRankShare(1, n);
      for (let rank = 2; rank <= n; rank++) {
        const share = getRankShare(rank, n);
        expect(share).toBeLessThan(prev);
        prev = share;
      }
    });
  });

  describe('getCompletionAward', () => {
    it('matches the design document M(tier) table', () => {
      expect(Math.round(getCompletionAward(1))).toBe(66);
      expect(Math.round(getCompletionAward(4))).toBe(143);
      expect(Math.round(getCompletionAward(6))).toBe(239);
      expect(Math.round(getCompletionAward(8))).toBe(399);
      expect(Math.round(getCompletionAward(9))).toBe(517);
      expect(Math.round(getCompletionAward(10))).toBe(668);
    });
  });

  describe('getRankPoints', () => {
    // "Worked values" table from the design document. Allow ±1 for rounding
    // differences between the document's rendering and Math.round.
    it.each([
      // [tier, N, rank, expected]
      [1, 50, 1, 1066],
      [1, 50, 10, 386],
      [1, 50, 50, 66],
      [1, 2857, 1, 4023],
      [1, 2857, 10, 2189],
      [1, 2857, 100, 1032],
      [1, 2857, 2857, 66],
      [1, 17_291, 1, 7364],
      [1, 17_291, 10, 4225],
      [1, 17_291, 100, 2244],
      [1, 17_291, 17_291, 66],
      [4, 145, 1, 3248],
      [4, 145, 10, 1430],
      [4, 145, 145, 143],
      [8, 17, 1, 4586],
      [8, 17, 10, 1014],
      [8, 17, 17, 399]
    ])(
      'tier %i, N=%i, rank %i pays about %i points',
      (tier, n, rank, expected) => {
        expect(
          Math.abs(getRankPoints(rank, n, tier) - expected)
        ).toBeLessThanOrEqual(1);
      }
    );

    it('pays the same for last place regardless of board size', () => {
      expect(getRankPoints(50, 50, 1)).toBe(getRankPoints(17_291, 17_291, 1));
    });

    it('returns integers', () => {
      for (const [rank, n, tier] of [
        [1, 1, 10],
        [3, 7, 2],
        [250, 600, 5]
      ]) {
        expect(Number.isInteger(getRankPoints(rank, n, tier))).toBe(true);
      }
    });

    it('is always positive', () => {
      expect(getRankPoints(1, 1, 1)).toBeGreaterThan(0);
      expect(getRankPoints(2, 2, 1)).toBeGreaterThan(0);
    });

    it('rejects invalid inputs', () => {
      expect(() => getRankPoints(0, 10, 1)).toThrow(RangeError);
      expect(() => getRankPoints(11, 10, 1)).toThrow(RangeError);
      expect(() => getRankPoints(1, 10, 0)).toThrow(RangeError);
      expect(() => getRankPoints(1.5, 10, 1)).toThrow(RangeError);
    });
  });

  describe('getRankPointsBreakdown', () => {
    it('splits points into rank share and completion award', () => {
      const breakdown = getRankPointsBreakdown(1, 50, 1);
      expect(breakdown.share).toBe(1);
      expect(breakdown.poolValue).toBeCloseTo(1000, 0);
      expect(breakdown.rankPoints).toBeCloseTo(breakdown.poolValue, 6);
      expect(breakdown.completionPoints).toBeCloseTo(
        RANK_POINTS_PARAMS.m * RANK_POINTS_PARAMS.pLadder,
        6
      );
      expect(breakdown.points).toBe(
        Math.round(breakdown.rankPoints + breakdown.completionPoints)
      );
    });

    it('uses custom params when provided', () => {
      const params = { ...RANK_POINTS_PARAMS, m: 0 };
      const breakdown = getRankPointsBreakdown(10, 10, 1, 1, params);
      expect(breakdown.completionPoints).toBe(0);
      // Nothing earned, but a finish is always worth at least 1.
      expect(breakdown.points).toBe(1);
    });
  });

  describe('getTrackWeight', () => {
    it('is 1 for main tracks regardless of count', () => {
      expect(getTrackWeight(TrackType.MAIN, 0)).toBe(1);
      expect(getTrackWeight(TrackType.MAIN, 7)).toBe(1);
    });

    it('splits the stage fraction across stages', () => {
      expect(getTrackWeight(TrackType.STAGE, 10)).toBe(0.05);
      expect(getTrackWeight(TrackType.STAGE, 1)).toBe(STAGE_POOL_FRACTION);
    });

    it('splits the bonus fraction across bonuses', () => {
      expect(getTrackWeight(TrackType.BONUS, 4)).toBe(0.0625);
      expect(getTrackWeight(TrackType.BONUS, 1)).toBe(BONUS_POOL_FRACTION);
    });

    it('never divides by zero', () => {
      expect(getTrackWeight(TrackType.STAGE, 0)).toBe(STAGE_POOL_FRACTION);
    });
  });

  describe('weighted points', () => {
    it('scales the unrounded score by the weight', () => {
      const full = getRankPointsBreakdown(3, 40, 4);
      const weighted = getRankPointsBreakdown(3, 40, 4, 0.05);
      expect(weighted.rankPoints).toBeCloseTo(full.rankPoints * 0.05, 9);
      expect(weighted.completionPoints).toBeCloseTo(
        full.completionPoints * 0.05,
        9
      );
      expect(weighted.points).toBe(
        Math.round((full.rankPoints + full.completionPoints) * 0.05)
      );
    });

    it('makes a full set of stages worth about half the main track', () => {
      // Same field finishing the main track and all 10 stages.
      const stages = 10;
      const weight = getTrackWeight(TrackType.STAGE, stages);
      const main = getRankPoints(1, 100, 3);
      const allStages = stages * getRankPoints(1, 100, 3, weight);
      expect(allStages / main).toBeCloseTo(STAGE_POOL_FRACTION, 2);
    });

    it('never rounds a finish down to 0', () => {
      expect(getRankPoints(500, 500, 1, 0.001)).toBe(1);
    });

    it('rejects a non-positive weight', () => {
      expect(() => getRankPoints(1, 10, 1, 0)).toThrow(RangeError);
    });
  });
});
