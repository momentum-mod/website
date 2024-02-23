import {
  Gamemode,
  GamemodeName,
  Leaderboard,
  TrackType
} from '@momentum/constants';
import { RequireAllOrNone } from 'type-fest';

export type GroupedMapLeaderboards = Array<
  {
    gamemode: Gamemode;
    gamemodeName: string;
    bonuses?: Array<{ num: number; tier: number }>;
    reviews?: MapReview[];
    totalRuns?: number;
    // If the map is ONLY bonuses, these are all undefined.
  } & RequireAllOrNone<{
    tier: number;
    ranked: boolean;
    linear: boolean;
    stages: number;
  }>
>;

export function groupMapLeaderboards(
  leaderboards: Leaderboard[]
): GroupedMapLeaderboards {
  const arr = [];
  for (const lb of leaderboards) {
    const gamemodeName = GamemodeName.get(lb.gamemode);
    let entry = arr.find((e) => e.gamemodeName === gamemodeName);

    if (!entry) {
      entry = { gamemode: lb.gamemode, gamemodeName };
      arr.push(entry);
    }

    if (lb.trackType === TrackType.MAIN) {
      entry.tier = lb.tier;
      entry.ranked = lb.ranked;
      entry.linear = lb.linear;
    } else if (lb.trackType === TrackType.STAGE) {
      if (!entry.stages) {
        entry.stages = 1;
      } else {
        entry.stages++;
      }
    } else {
      // Bonuses
      if (!entry.bonuses) entry.bonuses = [];
      entry.bonuses.push({
        num: lb.trackNum + 1, // trackNums start at 0
        tier: lb.tier
      });
    }
  }

  // Try to guess at what mode the map is primarily intended for: if no tier,
  // it has no main track, only bonuses (impossible to have stages but no main
  // track), so rank stuff with main track higher. Then rank higher if it's
  // ranked, or has more bonuses.
  arr.sort((a, b) =>
    (a.tier !== undefined && b.tier === undefined) ||
    (a.ranked && !b.ranked) ||
    (a.bonuses?.length ?? 0) > (b.bonuses?.length ?? 0)
      ? -1
      : 0
  );

  return arr;
}
