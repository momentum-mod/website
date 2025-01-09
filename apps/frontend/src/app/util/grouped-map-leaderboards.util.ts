import {
  Gamemode,
  GamemodeInfo,
  Leaderboard,
  LeaderboardType,
  MapReview,
  MMap,
  TrackType
} from '@momentum/constants';
import { RequireAllOrNone } from 'type-fest';

export type GroupedMapLeaderboards = Array<GroupedMapLeaderboard>;
export type GroupedMapLeaderboard = {
  gamemode: Gamemode;
  gamemodeName: string;
  bonuses?: Array<{ num: number; tier: number; type: LeaderboardType }>;
  reviews?: MapReview[];
  totalRuns?: number;
  allHidden: boolean;
  // If the map is ONLY bonuses, these are all undefined.
} & RequireAllOrNone<{
  tier: number;
  type: LeaderboardType;
  linear: boolean;
  stages: number;
}>;

export function groupMapLeaderboards(
  leaderboards: Leaderboard[]
): GroupedMapLeaderboards {
  const arr = [];
  for (const lb of leaderboards) {
    const gamemodeName = GamemodeInfo.get(lb.gamemode).name;
    let entry = arr.find((e) => e.gamemodeName === gamemodeName);

    if (!entry) {
      entry = { gamemode: lb.gamemode, gamemodeName };
      arr.push(entry);
    }

    if (lb.trackType === TrackType.MAIN) {
      entry.tier = lb.tier;
      entry.type = lb.type;
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
        num: lb.trackNum,
        tier: lb.tier,
        type: lb.type
      });
    }
  }

  for (const group of arr as GroupedMapLeaderboards) {
    group.allHidden =
      group.type === LeaderboardType.HIDDEN &&
      !group.bonuses?.some((bonus) => bonus.type !== LeaderboardType.HIDDEN);
  }

  // Try to guess at what mode the map is primarily intended for:
  // If no tier, it has no main track, only bonuses (impossible to have stages
  // but no main track), so rank stuff with main track higher.
  // Then try main ranked > main unranked > main hidden
  // Then if all lbs hidden
  // Then try > number bonuses
  arr.sort((a: GroupedMapLeaderboard, b: GroupedMapLeaderboard) => {
    if (a.tier !== b.tier) return a.tier === null ? 1 : -1;
    if (a.type !== b.type) return a.type - b.type;
    if (a.allHidden !== b.allHidden) return a.allHidden ? 1 : -1;
    if (a.bonuses?.length !== b.bonuses?.length)
      return (a.bonuses?.length ?? 0) - (b.bonuses?.length ?? 0);
    return 0;
  });

  return arr;
}

export type MapWithGroupedLeaderboard = MMap & {
  groupedLeaderboards: GroupedMapLeaderboards;
};

export type MapWithSpecificLeaderboard = MapWithGroupedLeaderboard & {
  currentModeLeaderboards?: GroupedMapLeaderboard;
};

export function getSpecificGroupedLeaderboard(
  leaderboards: GroupedMapLeaderboards,
  mode: Gamemode
): GroupedMapLeaderboard {
  return leaderboards.find(({ gamemode }) => gamemode === mode);
}
