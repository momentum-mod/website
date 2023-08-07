import { Gamemode } from '../../../';

export type MapSubmissionSuggestions = {
  [track: number]: {
    [x in Gamemode]: {
      tier: number;
      ranked: boolean;
      comment: string;
    };
  };
};
