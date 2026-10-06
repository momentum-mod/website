import { Gamemode, LeaderboardIdentifier, Style } from '@momentum/constants';

/**
 * Valkey key layout for rank points.
 *
 *   rankpoints:ladder:<gamemode>:<style>   ZSET userID -> total points on that ladder
 *   rankpoints:track:<leaderboard>         ZSET userID -> committed points on that track
 *   rankpoints:staging:<leaderboard>       ZSET userID -> freshly computed, not yet committed
 *   rankpoints:queue                       SET of <leaderboard> strings awaiting an update
 *   rankpoints:lock                        STRING, held by whichever worker is processing
 *   rankpoints:version                     STRING, RANK_POINTS_VERSION the data was built with
 *
 * <leaderboard> is `mapID:gamemode:trackType:trackNum:style`.
 */
const PREFIX = 'rankpoints';

export const RankPointsKeys = {
  queue: `${PREFIX}:queue`,
  lock: `${PREFIX}:lock`,
  version: `${PREFIX}:version`,
  trackPrefix: `${PREFIX}:track:`,
  stagingPrefix: `${PREFIX}:staging:`,
  ladderPrefix: `${PREFIX}:ladder:`,

  ladder(gamemode: Gamemode, style: Style): string {
    return `${this.ladderPrefix}${gamemode}:${style}`;
  },

  track(lb: LeaderboardIdentifier): string {
    return this.trackPrefix + serializeLeaderboard(lb);
  },

  staging(lb: LeaderboardIdentifier): string {
    return this.stagingPrefix + serializeLeaderboard(lb);
  }
};

export function serializeLeaderboard({
  mapID,
  gamemode,
  trackType,
  trackNum,
  style
}: LeaderboardIdentifier): string {
  return `${mapID}:${gamemode}:${trackType}:${trackNum}:${style}`;
}

export function parseLeaderboard(key: string): LeaderboardIdentifier {
  const parts = key.split(':');
  if (parts.length !== 5 || parts.some((p) => !/^\d+$/.test(p)))
    throw new Error(`Malformed leaderboard key: ${key}`);

  const [mapID, gamemode, trackType, trackNum, style] = parts.map(Number);
  return { mapID, gamemode, trackType, trackNum, style };
}
