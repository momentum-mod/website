import { Gamemode } from '@momentum/constants';

export interface LeaderboardKeyComponents {
  gamemode: Gamemode;
  trackType: number;
  trackNum: number;
  style: number;
}

/**
 * Utility function for generating a unique key for use in Objects/Maps of
 * leaderboards.
 *
 * Leaderboards do not have unique IDs; they are defined purely in terms of
 * this constituent components.
 */
export function leaderboardKey({
  gamemode,
  trackType,
  trackNum,
  style
}: LeaderboardKeyComponents): string {
  // This is *much* faster than using Array.join.
  return `${gamemode}-${trackType}-${trackNum}-${style}`;
}
