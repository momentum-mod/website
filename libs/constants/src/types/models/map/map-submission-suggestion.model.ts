import { Gamemode } from '../../../';

export interface MapSubmissionSuggestion {
  track: number;
  gamemode: Gamemode;
  tier: number;
  comment: string;
  ranked: boolean;
}
