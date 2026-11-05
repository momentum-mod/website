import { CompletionGroup } from '../enums/completion-group.enum';

/**
 * "Octave Ladder" group system:
 *   X = Number of completions
 *   1. Ranks 1-10 are fixed (world record + top 10). Numbered groups start at rank 11.
 *   2. Group 1 ends at:  g1 = max(15, 2% of X + 10)
 *   3. The last grouped rank is max(100, 67% of X). Ranks past it have no group
 *   4. Groups 1-6 end at geometric steps from g1 to the last grouped rank
 *      end(i) = g1 * ratio^(i-1),   ratio = (lastRank / g1)^(1/5)
 *   5. Every group is at least 5 ranks wide. On tiny tracks the lowest groups end up empty.
 */

/** Fixed size top group */
export const RANK_GROUP_TOP_RANKS = 10;
/** Group 1 share of completions (%). */
const G1_SHARE_PERCENT = 2;
/** Minimum last rank of group 1. */
const G1_MIN_END = 15;
/** Where the geometric ladder ends (% of completions). */
const LADDER_END_PERCENT = 67;
/** Ranks past this share of completions have no group (%). */
const GROUPING_CUTOFF_PERCENT = 67;
/** Boards with at most this many completions are always fully grouped ( GROUPING_CUTOFF_PERCENT doesn't apply below this number ) */
const ALWAYS_GROUPED_RANKS = 100;
/** Minimum number of ranks per group. Groups that can't fit end up empty on tiny boards. */
const MIN_GROUP_WIDTH = 5;
/** Geometrically spaced groups, in order */
const LOG_GROUPS = [
  CompletionGroup.GROUP_1,
  CompletionGroup.GROUP_2,
  CompletionGroup.GROUP_3,
  CompletionGroup.GROUP_4,
  CompletionGroup.GROUP_5,
  CompletionGroup.GROUP_6
];
/** k: extra evenly split groups after the ladder, in order. Currently unused */
const LINEAR_GROUPS: CompletionGroup[] = [];

/** Every numbered group in rank order; index matches getRankGroupEnds. */
const NUMBERED_GROUPS = [...LOG_GROUPS, ...LINEAR_GROUPS];

/** Number of numbered groups (excluding world record and top 10). */
export const RANK_GROUP_COUNT = NUMBERED_GROUPS.length;

/**
 * Last rank of each numbered group (index 0 = group 1). Never exceeds the board size.
 */
export function getRankGroupEnds(completions: number): number[] {
  const total = Math.max(0, Math.floor(completions));

  const group1End = Math.max(
    G1_MIN_END,
    Math.floor((total * G1_SHARE_PERCENT) / 100) + RANK_GROUP_TOP_RANKS
  );
  // Last grouped rank; everything after it has no group
  const lastRank = Math.min(
    total,
    Math.max(
      Math.round((total * GROUPING_CUTOFF_PERCENT) / 100),
      ALWAYS_GROUPED_RANKS
    )
  );
  // End of the geometric ladder
  const ladderEnd = Math.max(
    group1End,
    Math.min(
      Math.max((total * LADDER_END_PERCENT) / 100, ALWAYS_GROUPED_RANKS),
      lastRank
    )
  );

  const ends: number[] = [];
  let prev = RANK_GROUP_TOP_RANKS;

  const pushEnd = (ideal: number) => {
    const end = Math.max(
      prev,
      Math.min(lastRank, Math.max(Math.round(ideal), prev + MIN_GROUP_WIDTH))
    );
    ends.push(end);
    prev = end;
  };

  for (let i = 0; i < LOG_GROUPS.length; i++) {
    pushEnd(
      LOG_GROUPS.length === 1
        ? ladderEnd
        : group1End *
            Math.pow(ladderEnd / group1End, i / (LOG_GROUPS.length - 1))
    );
  }

  const ladderLastEnd = prev;
  for (let j = 1; j <= LINEAR_GROUPS.length; j++) {
    pushEnd(
      j === LINEAR_GROUPS.length
        ? lastRank
        : ladderLastEnd +
            ((lastRank - ladderLastEnd) * j) / LINEAR_GROUPS.length
    );
  }

  return ends;
}

/**
 * Returns null if the user hasn't completed the track, or if the rank is past the last group's cutoff
 */
export function getCompletionGroup(
  rank: number | null,
  ends: number[]
): CompletionGroup | null {
  if (rank == null) return null;
  if (rank === 1) return CompletionGroup.WORLD_RECORD;
  if (rank <= RANK_GROUP_TOP_RANKS) return CompletionGroup.TOP_10;

  const index = ends.findIndex((end) => rank <= end);
  return index === -1 ? null : NUMBERED_GROUPS[index];
}
