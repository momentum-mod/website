import { Gamemode, TrackType } from '../../../';

export interface MapSubmissionSuggestion {
  // TODO: #855 extends JsonObject {
  trackType: TrackType;
  trackNum: number;
  gamemode: Gamemode;
  tier: number;
  ranked: boolean;
  comment?: string;
}
