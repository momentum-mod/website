import { TrackType } from '@momentum/constants';

/**
 * Rank points model.
 *
 * A leaderboard ("board") is worth a pool of points, a finish on it claims a
 * share of that pool depending on rank, and finishing at all pays a flat award
 * that depends only on the board's tier.
 *
 *   score(board) = V(tier, N) · s(rank, N) + M(tier)
 *
 *   V(tier, N) = P · T(tier) · N^α          -- pool a WR claims in full
 *   T(tier)    = b^(tier - 1)               -- tier multiplier
 *   s(rank, N) = (rank^-γ - N^-γ) / (1 - N^-γ)  -- share of pool, 1 at WR, 0 at last
 *   M(tier)    = m · P · T(tier)            -- completion award
 *
 * Stages and bonuses are scored the same way, then weighted so each kind of
 * track shares a fixed fraction of what the map's main track is worth:
 *
 *   main:  score
 *   stage: score · STAGE_POOL_FRACTION / (stages on the map)
 *   bonus: score · BONUS_POOL_FRACTION / (ranked bonuses on the map)
 *
 * So finishing every stage is worth roughly half the main track, and every
 * ranked bonus roughly a quarter, however many of them a map has. Stages have
 * no tier of their own and use the main track's.
 *
 * A player's total for a gamemode+style ladder is the plain sum of their
 * weighted scores across every eligible board. No decay, no cap.
 *
 * Constants were fitted against production Surf and Bhop ranked main-track
 * data. See the design and calibration documents for the reasoning behind
 * each. If any of these change, every stored total changes with them, so
 * bump RANK_POINTS_VERSION so caches know to rebuild.
 */
export interface RankPointsParams {
  /** Tier multiplier step. T(tier) = b^(tier - 1). Fitted: cliff^α. */
  b: number;
  /** Value of popularity. Pool scales as N^α. */
  alpha: number;
  /** Rank falloff steepness. How much of the pool reaches the field. */
  gamma: number;
  /** Completion award, as a fraction of P · T(tier). */
  m: number;
  /** Overall scale. Cosmetic: a tier-1 board with 50 completions pays ~1000. */
  pLadder: number;
}

export const RANK_POINTS_PARAMS: Readonly<RankPointsParams> = Object.freeze({
  b: 1.293,
  alpha: 0.34,
  gamma: 0.2,
  m: 0.25,
  pLadder: 264.45
});

/**
 * Bump whenever RANK_POINTS_PARAMS or the formula changes, so persisted
 * totals derived from the old model get regenerated.
 */
export const RANK_POINTS_VERSION = 2;

/** What all of a map's stages together are worth, relative to its main track. */
export const STAGE_POOL_FRACTION = 0.5;

/**
 * What all of a map's ranked bonuses together are worth, relative to its main
 * track.
 */
export const BONUS_POOL_FRACTION = 0.25;

/**
 * Multiplier for a board's score based on its track type.
 *
 * @param trackCount For stages, how many the map has; for bonuses, how many
 *   *ranked* bonuses it has (both for the board's gamemode+style). Ignored for
 *   main tracks.
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
  /** Total rounded points for this run. */
  points: number;
  /** Points from rank share of the pool, weighted, before rounding. */
  rankPoints: number;
  /** Flat completion award, weighted, before rounding. */
  completionPoints: number;
  /** Track weight applied to both of the above. See `getTrackWeight`. */
  weight: number;
  /** Pool value V(tier, N) the rank share is taken from. */
  poolValue: number;
  /** Rank share s(rank, N) in [0, 1]. */
  share: number;
}

/** Tier multiplier T(tier) = b^(tier - 1). */
export function getTierMultiplier(
  tier: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return params.b ** (tier - 1);
}

/** Pool value V(tier, N): what a world record on this board claims in full. */
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

/**
 * Rank share s(rank, N) = (rank^-γ - N^-γ) / (1 - N^-γ).
 *
 * Exactly 1 at rank 1 and exactly 0 at rank N for every board size. For a
 * board with a single completion the denominator collapses; the lone finisher
 * is both the record holder and last place, and gets the full share.
 */
export function getRankShare(
  rank: number,
  completions: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  if (completions <= 1) return 1;

  const lastShare = completions ** -params.gamma;
  const share = (rank ** -params.gamma - lastShare) / (1 - lastShare);

  // Guard float noise at the endpoints.
  return Math.min(1, Math.max(0, share));
}

/** Completion award M(tier) = m · P · T(tier). Independent of board size. */
export function getCompletionAward(
  tier: number,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return params.m * params.pLadder * getTierMultiplier(tier, params);
}

/**
 * Full breakdown of the points a single run is worth.
 *
 * @param rank 1-based rank of the run on its board (ties broken by submission
 *   date, so ranks are unique)
 * @param completions Number of runs on the board (N)
 * @param tier Leaderboard tier, 1-10 (a stage uses its main track's tier)
 * @param weight Track weight, see `getTrackWeight`. 1 for main tracks.
 */
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
    // Integers are deliberate: sums of integers stay exact in doubles, so
    // repeatedly adding and subtracting a track's points from a ladder total
    // never accumulates floating point drift. Every finish is worth at least
    // 1, so a heavily divided stage or bonus never rounds away to nothing.
    points: Math.max(1, Math.round(rankPoints + completionPoints)),
    rankPoints,
    completionPoints,
    weight,
    poolValue,
    share
  };
}

/**
 * Points a single run is worth. See `getRankPointsBreakdown`.
 */
export function getRankPoints(
  rank: number,
  completions: number,
  tier: number,
  weight = 1,
  params: RankPointsParams = RANK_POINTS_PARAMS
): number {
  return getRankPointsBreakdown(rank, completions, tier, weight, params).points;
}
