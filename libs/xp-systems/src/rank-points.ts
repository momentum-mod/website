import { TrackType } from '@momentum/constants';

/**
 * Rank points model, see https://docs.momentum-mod.org/guide/ranking/
 *
 *   score(board) = V(tier, N) · s(rank, N) + M(tier)
 *
 *   V(tier, N) = P · T(tier) · N^α          -- pool a WR claims in full
 *   T(tier)    = b^(tier - 1)               -- tier multiplier
 *   s(rank, N) = (rank^-γ - N^-γ) / (1 - N^-γ)  -- share of pool, 1 at WR, 0 at last
 *   M(tier)    = m · P · T(tier)            -- completion award
 *
 * Stages and bonuses are scored the same way, then weighted by
 * `getTrackWeight`. A player's ladder total is the sum of their weighted
 * scores across every eligible board.
 *
 * Changing any of these changes every stored total, so bump
 * RANK_POINTS_VERSION when you do.
 */
export interface RankPointsParams {
  /** Tier multiplier step */
  b: number;
  /** Popularity exponent */
  alpha: number;
  /** Rank falloff steepness, higher is steeper */
  gamma: number;
  /** Completion award, as a fraction of P · T(tier) */
  m: number;
  /** Overall scale */
  pLadder: number;
}

export const RANK_POINTS_PARAMS: Readonly<RankPointsParams> = Object.freeze({
  b: 1.293,
  alpha: 0.34,
  gamma: 0.5,
  m: 0.1,
  pLadder: 264.45
});

export const RANK_POINTS_VERSION = 3;

// What all of a map's stages/ranked bonuses together are worth, relative to
// its main track.
export const STAGE_POOL_FRACTION = 0.5;
export const BONUS_POOL_FRACTION = 0.25;

/**
 * @param trackCount For stages, how many the map has; for bonuses, how many
 *   *ranked* bonuses it has. Ignored for main tracks.
 */
export function getTrackWeight(
  trackType: TrackType,
  trackCount: number
): number {
  switch (trackType) {
    case TrackType.MAIN:
      return 1;
    case TrackType.STAGE:
      return STAGE_POOL_FRACTION / Math.max(1, trackCount);
    case TrackType.BONUS:
      return BONUS_POOL_FRACTION / Math.max(1, trackCount);
  }
}

export interface RankPointsBreakdown {
  points: number;
  rankPoints: number;
  completionPoints: number;
  weight: number;
  poolValue: number;
  share: number;
}

export function getTierMultiplier(
  tier: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return params.b ** (tier - 1);
}

export function getPoolValue(
  tier: number,
  completions: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return (
    params.pLadder *
    getTierMultiplier(tier, params) *
    completions ** params.alpha
  );
}

export function getRankShare(
  rank: number,
  completions: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  // A lone finisher is both the record holder and last place.
  if (completions <= 1) return 1;

  const lastShare = completions ** -params.gamma;
  const share = (rank ** -params.gamma - lastShare) / (1 - lastShare);

  // Guard float noise at the endpoints.
  return Math.min(1, Math.max(0, share));
}

export function getCompletionAward(
  tier: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return params.m * params.pLadder * getTierMultiplier(tier, params);
}

export function getRankPointsBreakdown(
  rank: number,
  completions: number,
  tier: number,
  weight = 1,
  params: RankPointsParams = RANK_POINTS_PARAMS
): RankPointsBreakdown {
  if (!Number.isInteger(rank) || rank < 1)
    throw new RangeError(`rank must be a positive integer, got ${rank}`);
  if (!Number.isInteger(completions) || completions < rank)
    throw new RangeError(
      `completions must be an integer >= rank, got ${completions} (rank ${rank})`
    );
  if (!Number.isInteger(tier) || tier < 1)
    throw new RangeError(`tier must be a positive integer, got ${tier}`);
  if (!(weight > 0))
    throw new RangeError(`weight must be positive, got ${weight}`);

  const poolValue = getPoolValue(tier, completions, params);
  const share = getRankShare(rank, completions, params);
  const rankPoints = poolValue * share * weight;
  const completionPoints = getCompletionAward(tier, params) * weight;

  return {
    // Integers so ladder totals never accumulate float drift, and at least 1
    // so a heavily divided stage or bonus never rounds away to nothing.
    points: Math.max(1, Math.round(rankPoints + completionPoints)),
    rankPoints,
    completionPoints,
    weight,
    poolValue,
    share
  };
}

export function getRankPoints(
  rank: number,
  completions: number,
  tier: number,
  weight = 1,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return getRankPointsBreakdown(rank, completions, tier, weight, params).points;
}
