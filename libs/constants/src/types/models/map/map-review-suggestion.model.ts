import { Gamemode, TrackType } from '../../../';

export interface MapReviewSuggestion {
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  tier?: number;
  gameplayRating?: number;
}
