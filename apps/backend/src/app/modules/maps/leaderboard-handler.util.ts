import {
  Gamemode,
  GamemodeCategories,
  GamemodeCategory,
  IncompatibleGamemodes,
  LeaderboardType,
  MapSubmissionSuggestion,
  MapZones,
  TrackType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { arrayFrom } from '@momentum/util-fn';
import { isLinearMainTrack } from '@momentum/formats/zone';

export interface LeaderboardProps
  extends Pick<MapSubmissionSuggestion, 'gamemode' | 'trackType' | 'trackNum'> {
  linear?: boolean;
}

/**
 * Expand an array of map suggestions to data we can create all the
 * leaderboards we want from, including stages and all compatible gamemodes
 */
export function getMaximalLeaderboards<T extends LeaderboardProps>(
  leaderboards: T[],
  zones: MapZones
): LeaderboardProps[] {
  return getCompatibleLeaderboards(
    [
      ...setLeaderboardLinearity(leaderboards, zones),
      ...getStageLeaderboards(leaderboards, zones)
    ],
    zones
  );
}

/**
 * Expand an array of MapSubmissionSuggestions in one containing equiv.
 * entries for gamemodes that's "incompatible" with the suggestion's gamemode.
 * E.g. a rocket jump track also gets a sticky jump entry, but not surf.
 */
export function getCompatibleLeaderboards<T extends LeaderboardProps>(
  leaderboards: T[],
  zones: MapZones
): LeaderboardProps[] {
  return (
    leaderboards
      .flatMap(({ trackType, trackNum, linear, gamemode }) =>
        Enum.values(Gamemode) // Note: this will include `suggestion`
          .filter(
            (newGamemode) =>
              !IncompatibleGamemodes.get(gamemode).has(newGamemode)
          )
          .map((newGamemode) => ({
            trackType,
            trackNum,
            linear,
            gamemode: newGamemode
          }))
      )
      // Filter out any duplicates
      .filter((x, i, array) => !array.some((y, j) => isEqual(x, y) && i < j))
      // Filter out any bonuses not in Defrag where the defragModifiers field is set
      .filter(
        ({ trackType, trackNum, gamemode }) =>
          trackType !== TrackType.BONUS ||
          GamemodeCategories.get(GamemodeCategory.DEFRAG).includes(gamemode) ||
          !zones.tracks.bonuses[trackNum - 1]?.defragModifiers // ignore if undefined or 0
      )
  );
}

/**
 * Returns leaderboard create inputs for all the stages on all gamemodes of
 * a staged main track
 *
 * Stages have no important user-submitted data and tedious for them to
 * create in frontend, so we may as well automatically generate them
 */
export function getStageLeaderboards<T extends LeaderboardProps>(
  leaderboards: T[],
  zones: MapZones
): T[] {
  return zones.tracks.main.zones.segments.length === 1
    ? []
    : leaderboards
        .filter(({ trackType }) => trackType === TrackType.MAIN)
        .flatMap((lb: T) =>
          arrayFrom(
            zones.tracks.main.zones.segments.length,
            (i) =>
              ({
                gamemode: lb.gamemode,
                // Whether is ranked depends on main Track, doesn't have a tier.
                type: (lb as T & { type?: LeaderboardType }).type,
                trackType: TrackType.STAGE,
                trackNum: i + 1
              }) as unknown as T
          )
        );
}

export function isEqual<T extends LeaderboardProps, U extends LeaderboardProps>(
  x: T,
  y: U
) {
  return (
    x.gamemode === y.gamemode &&
    x.trackType === y.trackType &&
    x.trackNum === y.trackNum
  );
}

/**
 * Set linear (true/false/undef) for each suggestion based on zones
 */
export function setLeaderboardLinearity<T extends LeaderboardProps>(
  leaderboards: T[],
  zones: MapZones
): T[] {
  return leaderboards.map((lb) => ({
    ...lb,
    linear:
      lb.trackType === TrackType.MAIN ? isLinearMainTrack(zones) : undefined
  }));
}
