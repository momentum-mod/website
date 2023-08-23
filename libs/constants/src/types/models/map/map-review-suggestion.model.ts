import { Gamemode } from '../../../';

export interface MapReviewSuggestion {
  track: number;
  gamemode: Gamemode;
  tier: number;
  comment: string;
  gameplayRating: number;
}
