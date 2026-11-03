/**
 * The "group" a user's personal best falls into on a leaderboard, used by the
 * game's map selector to summarise a player's standing per track.
 *
 * WORLD_RECORD and TOP_10 take priority over the numbered groups. The numbered
 * groups (1-6) are the display-only rank groups (`getCompletionGroup` in
 * @momentum/constants), so a run shows the same group here as on the
 * leaderboards. NO_GROUP is a completion past the last group's cutoff.
 */
export enum CompletionGroup {
  WORLD_RECORD = 0,
  TOP_10 = 1,
  GROUP_1 = 2,
  GROUP_2 = 3,
  GROUP_3 = 4,
  GROUP_4 = 5,
  GROUP_5 = 6,
  GROUP_6 = 7,
  NO_GROUP = 8
}
