/**
 * The "group" a user's personal best falls into on a leaderboard, used by the
 * game's map selector to summarise a player's standing per track.
 *
 * WORLD_RECORD and TOP_10 take priority over the numbered groups. The numbered
 * groups (1-4) mirror the formula-based groups used by the XP system
 * (`XpSystems.getRankXpForRank`), so a run shows the same group here as the one
 * that awarded its rank XP.
 */
export enum CompletionGroup {
  WORLD_RECORD = 0,
  TOP_10 = 1,
  GROUP_1 = 2,
  GROUP_2 = 3,
  GROUP_3 = 4,
  GROUP_4 = 5
}
