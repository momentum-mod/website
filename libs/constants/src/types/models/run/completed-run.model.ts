import { LeaderboardRun } from './leaderboard-run.model';

export interface XpGain {
  rankXP: number;
  cosXP: {
    gainLvl: number;
    oldXP: number;
    gainXP: number;
  };
}

export interface CompletedRun {
  isNewWorldRecord: boolean;
  isNewPersonalBest: boolean;
  run: LeaderboardRun;
  xp: XpGain;
}
