import {
  Gamemode,
  IncompatibleGamemodes,
  LeaderboardType,
  MapSubmissionSuggestion,
  MapZones,
  TrackType
} from '@momentum/constants';
import { ZoneUtil } from '@momentum/formats/zone';
import { Enum } from '@momentum/enum';
import { arrayFrom } from '@momentum/util-fn';

export interface LeaderboardProps
  extends Pick<MapSubmissionSuggestion, 'gamemode' | 'trackType' | 'trackNum'> {
  linear?: boolean;
}

export const LeaderboardHandler = {
  /**
   * Expand an array of map suggestions to data we can create all the
   * leaderboards we want from, including stages and all compatible gamemodes
   */
  getMaximalLeaderboards: <T extends LeaderboardProps>(
    leaderboards: T[],
    zones: MapZones
  ): LeaderboardProps[] =>
    LeaderboardHandler.getCompatibleLeaderboards([
      ...LeaderboardHandler.setLeaderboardLinearity(leaderboards, zones),
      ...LeaderboardHandler.getStageLeaderboards(leaderboards, zones)
    ]),

  /**
   * Expand an array of MapSubmissionSuggestions in one containing equiv.
   * entries for gamemodes that's "incompatible" with the suggestion's gamemode.
   * E.g. a rocket jump track also gets a sticky jump entry, but not surf.
   */
  getCompatibleLeaderboards: <T extends LeaderboardProps>(
    leaderboards: T[]
  ): LeaderboardProps[] =>
    leaderboards
      .flatMap(({ trackType, trackNum, linear, gamemode }) =>
        Enum.values(Gamemode) // Note: this will include `suggestion`
          .filter(
            (newGamemode) =>
              !IncompatibleGamemodes.get(gamemode).includes(newGamemode)
          )
          .map((newGamemode) => ({
            trackType,
            trackNum,
            linear,
            gamemode: newGamemode
          }))
      )
      .filter(
        // Filter out any duplicates
        (x, i, array) =>
          !array.some(
            (y, j) =>
              x.trackType === y.trackType &&
              x.trackNum === y.trackNum &&
              x.gamemode === y.gamemode &&
              i < j
          )
      ),

  /**
   * Returns leaderboard create inputs for all the stages on all gamemodes of
   * a staged main track
   *
   * Stages have no important user-submitted data and tedious for them to
   * create in frontend, so we may as well automatically generate them
   */
  getStageLeaderboards: <T extends LeaderboardProps>(
    leaderboards: T[],
    zones: MapZones
  ): T[] =>
    leaderboards
      .filter(({ trackType }) => trackType === TrackType.MAIN)
      .flatMap((lb: T) =>
        arrayFrom(
          zones.tracks.stages.length,
          (i) =>
            ({
              gamemode: lb.gamemode,
              // Whether is ranked depends on main Track, doesn't have a tier.
              type: (lb as T & { type?: LeaderboardType }).type,
              trackType: TrackType.STAGE,
              trackNum: i
            }) as unknown as T
        )
      ),

  isEqual: <T extends LeaderboardProps, U extends LeaderboardProps>(
    x: T,
    y: U
  ) =>
    x.gamemode === y.gamemode &&
    x.trackType === y.trackType &&
    x.trackNum === y.trackNum,

  /**
   * Set linear (true/false/undef) for each suggestion based on zones
   */
  setLeaderboardLinearity: <T extends LeaderboardProps>(
    leaderboards: T[],
    zones: MapZones
  ): T[] =>
    leaderboards.map((lb) => ({
      ...lb,
      linear:
        lb.trackType === TrackType.MAIN
          ? ZoneUtil.isLinearMainTrack(zones)
          : undefined
    }))
};
