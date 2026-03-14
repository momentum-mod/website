import { Gamemode, LeaderboardID } from '@momentum/constants';

export function TrackLeaderboard({
  gamemode,
  mapID,
  style,
  trackNum,
  trackType
}: LeaderboardID): string {
  return `${mapID}-${gamemode}-${trackType}-${trackNum}-${style}`;
}

export function TrackLeaderboardPoints(leaderboardID: LeaderboardID): string {
  return `track_points:${TrackLeaderboard(leaderboardID)}`;
}

export function GamemodeLeaderboardPoints(gamemode: Gamemode): string {
  return `gamemode_points:${gamemode}`;
}
