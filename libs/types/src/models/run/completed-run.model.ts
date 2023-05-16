import { Rank, Run } from '@momentum/types';

export interface CompletedRun {
  isNewWorldRecord: boolean;
  isNewPersonalBest: boolean;
  rank: Rank;
  run: Run;
  xp: {
    rankXP: number;
    cosXP: {
      gainLvl: number;
      oldXP: number;
      gainXP: number;
    };
  };
}
