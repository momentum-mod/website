import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getCompletionAward,
  getRankPoints,
  getRankPointsBreakdown,
  getRankShare,
  getTierMultiplier,
  RANK_POINTS_PARAMS
} from './rank-points';

function assertCloseTo(actual: number, expected: number, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

describe('rank-points', () => {
  describe('getTierMultiplier', () => {
    it('should be 1 at tier 1 and grow geometrically', () => {
      assert.equal(getTierMultiplier(1), 1);
      assertCloseTo(getTierMultiplier(2), 1.293, 0.0005);
      assertCloseTo(getTierMultiplier(10), 10.1, 0.05);
    });
  });

  describe('getRankShare', () => {
    it('should be exactly 1 at rank 1 and exactly 0 at last place for any N', () => {
      for (const n of [2, 10, 100, 2000, 17_291]) {
        assert.equal(getRankShare(1, n), 1);
        assert.equal(getRankShare(n, n), 0);
      }
    });

    it('should give a solo board the full share', () => {
      assert.equal(getRankShare(1, 1), 1);
    });

    it('should match the design document table at γ = 0.20', () => {
      // Rank 10 on various board sizes
      assertCloseTo(getRankShare(10, 100), 0.387, 0.0005);
      assertCloseTo(getRankShare(10, 2000), 0.528, 0.0005);
      assertCloseTo(getRankShare(10, 17_291), 0.57, 0.0005);
      // Rank 2 of 10
      assertCloseTo(getRankShare(2, 10), 0.649, 0.0005);
      // Rank 1000 of 17291
      assertCloseTo(getRankShare(1000, 17_291), 0.127, 0.0005);
    });

    it('should be strictly decreasing in rank', () => {
      const n = 500;
      let prev = getRankShare(1, n);
      for (let rank = 2; rank <= n; rank++) {
        const share = getRankShare(rank, n);
        assert.ok(share < prev);
        prev = share;
      }
    });
  });

  describe('getCompletionAward', () => {
    it('should match the design document M(tier) table', () => {
      assert.equal(Math.round(getCompletionAward(1)), 66);
      assert.equal(Math.round(getCompletionAward(4)), 143);
      assert.equal(Math.round(getCompletionAward(6)), 239);
      assert.equal(Math.round(getCompletionAward(8)), 399);
      assert.equal(Math.round(getCompletionAward(9)), 517);
      assert.equal(Math.round(getCompletionAward(10)), 668);
    });
  });

  describe('getRankPoints', () => {
    // "Worked values" table from the design document. Allow ±1 for rounding
    // differences between the document's rendering and Math.round.
    // prettier-ignore
    for (const [tier, n, rank, expected] of [
      // Tier | N | Rank | Expected
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
    ]) {
      it(`tier ${tier}, N=${n}, rank ${rank} should pay about ${expected} points`, () => {
        assert.ok(Math.abs(getRankPoints(rank, n, tier) - expected) <= 1);
      });
    }

    it('should pay the same for last place regardless of board size', () => {
      assert.equal(getRankPoints(50, 50, 1), getRankPoints(17_291, 17_291, 1));
    });

    it('should return integers', () => {
      for (const [rank, n, tier] of [
        [1, 1, 10],
        [3, 7, 2],
        [250, 600, 5]
      ]) {
        assert.ok(Number.isInteger(getRankPoints(rank, n, tier)));
      }
    });

    it('should always be positive', () => {
      assert.ok(getRankPoints(1, 1, 1) > 0);
      assert.ok(getRankPoints(2, 2, 1) > 0);
    });

    it('should reject invalid inputs', () => {
      assert.throws(() => getRankPoints(0, 10, 1), RangeError);
      assert.throws(() => getRankPoints(11, 10, 1), RangeError);
      assert.throws(() => getRankPoints(1, 10, 0), RangeError);
      assert.throws(() => getRankPoints(1.5, 10, 1), RangeError);
    });
  });

  describe('getRankPointsBreakdown', () => {
    it('should split points into rank share and completion award', () => {
      const breakdown = getRankPointsBreakdown(1, 50, 1);
      assert.equal(breakdown.share, 1);
      assertCloseTo(breakdown.poolValue, 1000, 0.5);
      assertCloseTo(breakdown.rankPoints, breakdown.poolValue);
      assertCloseTo(
        breakdown.completionPoints,
        RANK_POINTS_PARAMS.m * RANK_POINTS_PARAMS.pLadder
      );
      assert.equal(
        breakdown.points,
        Math.round(breakdown.rankPoints + breakdown.completionPoints)
      );
    });

    it('should use custom params when provided', () => {
      const params = { ...RANK_POINTS_PARAMS, m: 0 };
      const breakdown = getRankPointsBreakdown(10, 10, 1, params);
      assert.equal(breakdown.completionPoints, 0);
      assert.equal(breakdown.points, 0);
    });
  });
});
