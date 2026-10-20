/**
 * Rank groups: percentile bands below a leaderboard's top 10, purely for
 * display. They don't affect rank points in any way.
 *
 * Cutoffs follow KSF's surf ranking, derived from its in-game map info: the
 * top 10 are left out, then the last group (6) ends two thirds of the way
 * through the remaining field, and each better group ends at half the
 * previous group's fraction:
 *
 *   group k ends at rank 10 + floor((N - 10) · (2/3) / 2^(6 - k))
 *
 * i.e. the top 2.08%, 4.17%, 8.33%, 16.7%, 33.3% and 66.7% of the field after
 * the top 10. On small boards each group ends no earlier than a fixed minimum
 * rank (also KSF's), so groups don't shrink to a rank or two. Anyone past
 * group 6's cutoff is in no group.
 */

/** Ranks above the groups, shown individually. */
export const RANK_GROUP_TOP_RANKS = 10;

/** How far through the field after the top 10 the last group reaches. */
export const RANK_GROUP_FIELD_FRACTION = 2 / 3;

/**
 * The earliest rank each group (1 to 6) may end at. Also fixes the number of
 * groups.
 */
export const RANK_GROUP_MIN_ENDS: readonly number[] = Object.freeze([
  20, 35, 60, 100, 150, 200
]);

export const RANK_GROUP_COUNT = RANK_GROUP_MIN_ENDS.length;

/**
 * The last rank in each group (index 0 is group 1) for a board with this many
 * completions. Ends can exceed the board size on small boards; such groups
 * simply contain every remaining rank.
 */
export function getRankGroupEnds(completions: number): number[] {
  const field = Math.max(0, completions - RANK_GROUP_TOP_RANKS);
  return RANK_GROUP_MIN_ENDS.map((minEnd, i) =>
    Math.max(
      minEnd,
      RANK_GROUP_TOP_RANKS +
        Math.floor(
          (field * RANK_GROUP_FIELD_FRACTION) / 2 ** (RANK_GROUP_COUNT - 1 - i)
        )
    )
  );
}

export interface RankGroup {
  /** 1 (best) to RANK_GROUP_COUNT. */
  group: number;
  /** First rank in the group. */
  firstRank: number;
  /** Last rank in the group, capped at the board's completions. */
  lastRank: number;
}

/**
 * The group a rank falls in, or null for the top 10 and for ranks past the
 * last group's cutoff.
 */
export function getRankGroup(
  rank: number,
  completions: number
): RankGroup | null {
  if (rank <= RANK_GROUP_TOP_RANKS || rank > completions) return null;

  const ends = getRankGroupEnds(completions);
  const index = ends.findIndex((end) => rank <= end);
  if (index === -1) return null;

  return {
    group: index + 1,
    firstRank: index === 0 ? RANK_GROUP_TOP_RANKS + 1 : ends[index - 1] + 1,
    lastRank: Math.min(ends[index], completions)
  };
}
