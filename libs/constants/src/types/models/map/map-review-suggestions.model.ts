import { Gamemode } from '../../../';

export type MapReviewSuggestions = {
  [track: number]: {
    [x in Gamemode]: {
      tier: number;
      comment: string;
      gameplayRating: number; // Int 0 - 10
    };
  };
};
