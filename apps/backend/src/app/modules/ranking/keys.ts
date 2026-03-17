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

export const TrackLeaderboardPointsPrefix = 'track_points:';
export function TrackLeaderboardPoints(leaderboardID: LeaderboardID): string {
  return `${TrackLeaderboardPointsPrefix}:${TrackLeaderboard(leaderboardID)}`;
}

export const GamemodeLeaderboardPointsPrefix = 'gamemode_points:';
export function GamemodeLeaderboardPoints(gamemode: Gamemode): string {
  return `${GamemodeLeaderboardPointsPrefix}:${gamemode}`;
}
