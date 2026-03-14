import { LeaderboardID } from '@momentum/constants';

export function LeaderboardKey({
  gamemode,
  mapID,
  style,
  trackNum,
  trackType
}: LeaderboardID): string {
  return `${mapID}-${gamemode}-${trackType}-${trackNum}-${style}`;
}
