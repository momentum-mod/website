import { Gamemode, LeaderboardType, TrackType } from '../../../';

export interface MapSubmissionSuggestion {
  // TODO: #855 extends JsonObject {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier: number;
  type: LeaderboardType.RANKED | LeaderboardType.UNRANKED;
  comment?: string;
  //  TODO: Tags!
}
