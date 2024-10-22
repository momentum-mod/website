import { TrackType } from '@momentum/constants';
import {
  COS_XP_PARAMS,
  CosXpParams,
  RANK_XP_PARAMS,
  RankXpGain,
  RankXpParams
} from './index';

/**
 * This class provides methods for calculating rank and cosmetic XP. It needs to
 * calculate and stores an array of 500 (soon 3000) level boundaries in memory,
 * so we provide a class that can be extended by Nest/Angular services and
 * injected where needed (though full disclosure, this takes under 1ms so
 * doesn't matter that much).
 *
 * A static class version could be made if required, but I'd rather rely on Nest
 * and Angular's dependency injectors.
 */
export class XpSystems {
  public readonly cosXpParams: CosXpParams = COS_XP_PARAMS;
  public readonly rankXpParams: RankXpParams = RANK_XP_PARAMS;
  private readonly xpInLevels: number[];
  private readonly xpForLevels: number[];

  constructor() {
    this.xpInLevels = [0];
    this.xpForLevels = [0, 0];

    for (let i = 1; i < this.cosXpParams.levels.maxLevels; i++) {
      this.xpInLevels[i] = this.getCosmeticXpInLevel(i);

      if (i > 0)
        this.xpForLevels[i] = this.xpForLevels[i - 1] + this.xpInLevels[i];
    }
  }

  getCosmeticXpInLevel(level: number): number {
    const levels = this.cosXpParams.levels;

    if (!levels || level < 1 || level > levels.maxLevels) return -1;

    if (level < levels.staticScaleStart) {
      return (
        levels.startingValue +
        levels.linearScaleBaseIncrease *
          level *
          (levels.linearScaleIntervalMultiplier *
            Math.ceil(level / levels.linearScaleInterval))
      );
    } else {
      return (
        levels.linearScaleBaseIncrease *
        (levels.staticScaleStart - 1) *
        (levels.linearScaleIntervalMultiplier *
          Math.ceil(
            (levels.staticScaleStart - 1) / levels.linearScaleInterval
          )) *
        (level >= levels.staticScaleStart + levels.staticScaleInterval
          ? levels.staticScaleBaseMultiplier +
            Math.floor(
              (level - levels.staticScaleStart) / levels.staticScaleInterval
            ) *
              levels.staticScaleIntervalMultiplier
          : levels.staticScaleBaseMultiplier)
      );
    }
  }

  getCosmeticXpForLevel(level: number): number {
    if (
      !this.cosXpParams ||
      level < 1 ||
      level > this.cosXpParams.levels.maxLevels
    )
      return -1;
    return this.xpForLevels[level];
  }

  getCosmeticXpForCompletion(
    tier: number,
    type: TrackType,
    isLinear: boolean,
    isUnique: boolean
  ): number {
    let xp: number;
    const initialScale = XpSystems.getInitialScale(tier);

    if (type === TrackType.BONUS) {
      // This needs to probably change (0.9.0+)
      const baseBonus = Math.ceil(
        (this.cosXpParams.completions.unique.tierScale.linear *
          XpSystems.getInitialScale(3) +
          this.cosXpParams.completions.unique.tierScale.linear *
            XpSystems.getInitialScale(4)) /
          2
      );
      xp = isUnique
        ? baseBonus
        : Math.ceil(
            baseBonus / this.cosXpParams.completions.repeat.tierScale.bonus
          );
    } else {
      const baseXP =
        (isLinear
          ? this.cosXpParams.completions.unique.tierScale.linear
          : this.cosXpParams.completions.unique.tierScale.staged) *
        initialScale;
      if (type === TrackType.STAGE) {
        // Unique counts as a repeat
        xp = Math.ceil(
          baseXP /
            this.cosXpParams.completions.repeat.tierScale.staged /
            this.cosXpParams.completions.repeat.tierScale.stages
        );
      } else {
        xp = isUnique
          ? baseXP
          : Math.ceil(
              baseXP /
                (isLinear
                  ? this.cosXpParams.completions.repeat.tierScale.linear
                  : this.cosXpParams.completions.repeat.tierScale.staged)
            );
      }
    }

    return xp;
  }

  getRankXpForRank(rank: number, completions: number): RankXpGain {
    const rankGain: RankXpGain = {
      rankXP: 0,
      group: {
        groupXP: 0,
        groupNum: -1
      },
      formula: 0,
      top10: 0
    };

    // Regardless of run, we want to calculate formula points
    const formulaPoints = Math.ceil(
      this.rankXpParams.formula.A / (rank + this.rankXpParams.formula.B)
    );
    rankGain.formula = formulaPoints;
    rankGain.rankXP += formulaPoints;

    // Calculate Top10 points if in there
    if (rank <= 10) {
      const top10Points = Math.ceil(
        this.rankXpParams.top10.rankPercentages[rank - 1] *
          this.rankXpParams.top10.WRPoints
      );
      rankGain.top10 = top10Points;
      rankGain.rankXP += top10Points;
    } else {
      // Otherwise we calculate group points depending on group location

      // Going to have to calculate groupSizes dynamically
      const groupSizes = [];
      for (let i = 0; i < this.rankXpParams.groups.maxGroups; i++) {
        groupSizes[i] = Math.max(
          this.rankXpParams.groups.groupScaleFactors[i] *
            completions ** this.rankXpParams.groups.groupExponents[i],
          this.rankXpParams.groups.groupMinSizes[i]
        );
      }

      let rankOffset = 11;
      for (let i = 0; i < this.rankXpParams.groups.maxGroups; i++) {
        if (rank < rankOffset + groupSizes[i]) {
          const groupPoints = Math.ceil(
            this.rankXpParams.top10.WRPoints *
              this.rankXpParams.groups.groupPointPcts[i]
          );
          rankGain.group.groupNum = i + 1;
          rankGain.group.groupXP = groupPoints;
          rankGain.rankXP += groupPoints;
          break;
        } else {
          rankOffset += groupSizes[i];
        }
      }
    }

    return rankGain;
  }

  getPrestige(totalLevel: number): number {
    return Math.floor(Math.max(totalLevel - 1, 0) / 500);
  }

  getInnerLevel(totallevel: number): number {
    return ((totallevel - 1) % 500) + 1;
  }

  private static getInitialScale(tier: number, type = 0) {
    switch (type) {
      case 0:
      default:
        return tier ** 2 - tier + 10;
      case 1:
        return tier ** 2;
      case 2:
        return tier ** 2 + 5;
    }
  }
}
