import { Run } from './run.model';

export interface CompletedRun {
  isNewWorldRecord: boolean;
  isNewPersonalBest: boolean;
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
