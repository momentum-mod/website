import { CosXpParams } from './index';

export const COS_XP_PARAMS: CosXpParams = {
  levels: {
    maxLevels: 3000,
    startingValue: 20000,
    linearScaleBaseIncrease: 1000,
    linearScaleInterval: 10,
    linearScaleIntervalMultiplier: 1,
    staticScaleStart: 101,
    staticScaleBaseMultiplier: 1.5,
    staticScaleInterval: 25,
    staticScaleIntervalMultiplier: 0.5
  },
  completions: {
    unique: {
      tierScale: {
        linear: 2500,
        staged: 2500
      }
    },
    repeat: {
      tierScale: {
        linear: 20,
        staged: 40,
        stages: 5,
        bonus: 40
      }
    }
  }
};
