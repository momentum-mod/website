import {
  Gamemode,
  GamemodeInfo,
  Leaderboard,
  LeaderboardType,
  MapReview,
  MapTag,
  MMap,
  Style,
  TrackType
} from '@momentum/constants';
import { extractPrefixFromMapName } from '@momentum/util-fn';
import { RequireAllOrNone } from 'type-fest';

export type GroupedMapLeaderboards = Array<GroupedMapLeaderboard>;
export type GroupedMapLeaderboard = {
  gamemode: Gamemode;
  gamemodeName: string;
  bonuses?: Array<{
    num: number;
    tier: number;
    type: LeaderboardType;
    tags: MapTag[];
  }>;
  styles: Style[];
  reviews?: MapReview[];
  totalRuns?: number;
  allHidden: boolean;
  // If the map is ONLY bonuses, these are all undefined.
} & RequireAllOrNone<{
  tier: number;
  type: LeaderboardType;
  tags: MapTag[];
  linear: boolean;
  stages: number;
}>;

export type MapWithGroupedLeaderboard = MMap & {
  groupedLeaderboards: GroupedMapLeaderboards;
};

export type MapWithSpecificLeaderboard = MapWithGroupedLeaderboard & {
  currentModeLeaderboards?: GroupedMapLeaderboard;
};

/**
 * Creates a new collection of leaderboards
 * by removing unnecessary fields and
 * adding new ones for utility.
 * Keeps the same element order from input.
 */
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

    if (!entry.styles) entry.styles = [];
    if (!entry.styles.includes(lb.style)) {
      entry.styles.push(lb.style);
    }

    if (lb.style === Style.NORMAL) {
      if (lb.trackType === TrackType.MAIN) {
        entry.tier = lb.tier;
        entry.type = lb.type;
        entry.linear = lb.linear;
        entry.tags = lb.tags;
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
          type: lb.type,
          tags: lb.tags
        });
      }
    }
  }

  for (const group of arr as GroupedMapLeaderboards) {
    group.allHidden =
      group.type === LeaderboardType.HIDDEN &&
      !group.bonuses?.some((bonus) => bonus.type !== LeaderboardType.HIDDEN);
  }

  return arr;
}

/**
 * Returns the leaderboard corresponding to given gamemode,
 * undefined if not found.
 */
export function getSpecificGroupedLeaderboard(
  leaderboards: GroupedMapLeaderboards,
  mode: Gamemode
): GroupedMapLeaderboard | undefined {
  return leaderboards.find(({ gamemode }) => gamemode === mode);
}

/**
 * Finds index for main gamemode in leaderboards collection.
 * First looks at map name to test for gamemode prefix,
 * then picks first ranked gamemode, then tries first unranked.
 * If nothing found, returns 0.
 */
export function findMainGamemodeIndex(
  leaderboards: GroupedMapLeaderboards,
  mapName: string
): number {
  const [, prefix] = extractPrefixFromMapName(mapName);
  for (const [, info] of GamemodeInfo) {
    if (info.prefix === prefix) {
      const lbIndex = leaderboards.findIndex(
        ({ gamemodeName }) => gamemodeName === info.name
      );

      if (lbIndex !== -1) return lbIndex;
      else break;
    }
  }

  const rankedIndex = leaderboards.findIndex(
    ({ type }) => type === LeaderboardType.RANKED
  );
  if (rankedIndex !== -1) return rankedIndex;

  const unrankedIndex = leaderboards.findIndex(
    ({ type }) => type === LeaderboardType.UNRANKED
  );
  if (unrankedIndex !== -1) return unrankedIndex;

  return 0;
}
