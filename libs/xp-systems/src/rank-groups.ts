// Rank groups are percentile bands below a leaderboard's top 10, purely for
// display; they don't affect rank points. Cutoffs follow KSF's surf ranking:
// group k ends at rank 10 + floor((N - 10) · (2/3) / 2^(6 - k)), but no earlier
// than RANK_GROUP_MIN_ENDS[k - 1].

export const RANK_GROUP_TOP_RANKS = 10;
export const RANK_GROUP_FIELD_FRACTION = 2 / 3;
export const RANK_GROUP_MIN_ENDS: readonly number[] = Object.freeze([
  20, 35, 60, 100, 150, 200
]);

export const RANK_GROUP_COUNT = RANK_GROUP_MIN_ENDS.length;

/** The last rank in each group, which can exceed the board size. */
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
  group: number;
  firstRank: number;
  lastRank: number;
}

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
