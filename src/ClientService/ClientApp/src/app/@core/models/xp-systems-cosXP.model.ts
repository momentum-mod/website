export interface CosmeticXPSystemParams {
  levels: {
    maxLevels: number;
    startingValue: number;
    linearScaleBaseIncrease: number;
    linearScaleInterval: number;
    linearScaleIntervalMultiplier: number;
    staticScaleStart: number;
    staticScaleBaseMultiplier: number;
    staticScaleInterval: number;
    staticScaleIntervalMultiplier: number;
  };
  completions: {
    unique: {
      tierScale: {
        linear: number;
        staged: number;
        // bonus is static, as (tierScale.linear * (initialScale(tier3)) + tierScale.linear * (initialScale(tier4))) / 2
      },
    },
    repeat: {
      tierScale: {
        linear: number;
        staged: number;
        stages: number;
        bonus: number; // = staged
      },
    },
  };
}
