export interface RankXPSystemParams {
  top10: {
    WRPoints: number,
    rankPercentages: number[],
  };
  formula: {
    A: number,
    B: number,
  };
  groups: {
    maxGroups: number,
    groupScaleFactors: number[],
    groupExponents: number[],
    groupMinSizes: number[];
    groupPointPcts: number[]; // How much, of a % of WRPoints, does each group get
  };
}
