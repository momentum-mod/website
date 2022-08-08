import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { XpSystemsRepoService } from '../repo/xp-systems-repo.service';
import { CosXpParams, RankXpGain, RankXpParams, XpParams } from './xp-systems.interface';

const DEFAULT_RANK_XP: RankXpParams = {
    top10: {
        WRPoints: 3000,
        rankPercentages: [1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43]
    },
    formula: {
        A: 50000,
        B: 49
    },
    groups: {
        maxGroups: 4,
        groupScaleFactors: [1, 1.5, 2, 2.5],
        groupExponents: [0.5, 0.56, 0.62, 0.68],
        groupMinSizes: [10, 45, 125, 250],
        groupPointPcts: [0.2, 0.13, 0.07, 0.03]
    }
};

const DEFAULT_COS_XP: CosXpParams = {
    levels: {
        maxLevels: 500,
        startingValue: 20000,
        linearScaleBaseIncrease: 1000,
        linearScaleInterval: 10,
        linearScaleIntervalMultiplier: 1.0,
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

@Injectable()
export class XpSystemsService implements OnModuleInit {
    constructor(private xpRepo: XpSystemsRepoService) {}

    private readonly logger = new Logger('XP Systems');

    private _cosXpParams: CosXpParams;
    private _rankXpParams: RankXpParams;
    private xpInLevels: number[];
    private xpForLevels: number[];

    public get xpParams(): XpParams {
        return {
            cosXP: this._cosXpParams,
            rankXP: this._rankXpParams
        };
    }

    public get rankXpParams(): RankXpParams {
        return this._rankXpParams;
    }

    public get cosXpParams(): CosXpParams {
        return this._cosXpParams;
    }

    async onModuleInit() {
        const params = await this.xpRepo.getXpParams();

        if (params) {
            this._rankXpParams = params.rankXP;
            this._cosXpParams = params.cosXP;
        } else {
            this.logger.log('Initialising empty XP parameters with defaults');

            await this.xpRepo.initXpParams(DEFAULT_RANK_XP, DEFAULT_COS_XP);

            this._rankXpParams = DEFAULT_RANK_XP;
            this._cosXpParams = DEFAULT_COS_XP;
        }

        this.generateLevelsArrays();

        this.logger.log('Initialised XP systems!');
    }

    getCosmeticXpInLevel(level: number): number {
        const levels = this._cosXpParams.levels;

        if (!levels || level < 1 || level > levels.maxLevels) return -1;

        if (level < levels.staticScaleStart) {
            return (
                levels.startingValue +
                levels.linearScaleBaseIncrease *
                    level *
                    (levels.linearScaleIntervalMultiplier * Math.ceil(level / levels.linearScaleInterval))
            );
        } else {
            return (
                levels.linearScaleBaseIncrease *
                (levels.staticScaleStart - 1) *
                (levels.linearScaleIntervalMultiplier *
                    Math.ceil((levels.staticScaleStart - 1) / levels.linearScaleInterval)) *
                (level >= levels.staticScaleStart + levels.staticScaleInterval
                    ? levels.staticScaleBaseMultiplier +
                      Math.floor((level - levels.staticScaleStart) / levels.staticScaleInterval) *
                          levels.staticScaleIntervalMultiplier
                    : levels.staticScaleBaseMultiplier)
            );
        }
    }

    getCosmeticXpForLevel(level: number): number {
        if (!this._cosXpParams || level < 1 || level > this._cosXpParams.levels.maxLevels) return -1;
        return this.xpForLevels[level];
    }

    getCosmeticXpForCompletion(
        tier: number,
        isLinear: boolean,
        isBonus: boolean,
        isUnique: boolean,
        isStageIL: boolean
    ): number {
        let xp: number;
        const initialScale = XpSystemsService.getInitialScale(tier);

        if (isBonus) {
            // This needs to probably change (0.9.0+)
            const baseBonus = Math.ceil(
                (this._cosXpParams.completions.unique.tierScale.linear * XpSystemsService.getInitialScale(3) +
                    this._cosXpParams.completions.unique.tierScale.linear * XpSystemsService.getInitialScale(4)) /
                    2
            );
            xp = isUnique ? baseBonus : Math.ceil(baseBonus / this._cosXpParams.completions.repeat.tierScale.bonus);
        } else {
            const baseXP =
                (isLinear
                    ? this._cosXpParams.completions.unique.tierScale.linear
                    : this._cosXpParams.completions.unique.tierScale.staged) * initialScale;
            if (isStageIL) {
                // Unique counts as a repeat
                xp = Math.ceil(
                    baseXP /
                        this._cosXpParams.completions.repeat.tierScale.staged /
                        this._cosXpParams.completions.repeat.tierScale.stages
                );
            } else {
                xp = isUnique
                    ? baseXP
                    : Math.ceil(
                          baseXP /
                              (isLinear
                                  ? this._cosXpParams.completions.repeat.tierScale.linear
                                  : this._cosXpParams.completions.repeat.tierScale.staged)
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
        const formulaPoints = Math.ceil(this._rankXpParams.formula.A / (rank + this._rankXpParams.formula.B));
        rankGain.formula = formulaPoints;
        rankGain.rankXP += formulaPoints;

        // Calculate Top10 points if in there
        if (rank <= 10) {
            const top10Points = Math.ceil(
                this._rankXpParams.top10.rankPercentages[rank - 1] * this._rankXpParams.top10.WRPoints
            );
            rankGain.top10 = top10Points;
            rankGain.rankXP += top10Points;
        } else {
            // Otherwise we calculate group points depending on group location

            // Going to have to calculate groupSizes dynamically
            const groupSizes = [];
            for (let i = 0; i < this._rankXpParams.groups.maxGroups; i++) {
                groupSizes[i] = Math.max(
                    this._rankXpParams.groups.groupScaleFactors[i] *
                        completions ** this._rankXpParams.groups.groupExponents[i],
                    this._rankXpParams.groups.groupMinSizes[i]
                );
            }

            let rankOffset = 11;
            for (let i = 0; i < this._rankXpParams.groups.maxGroups; i++) {
                if (rank < rankOffset + groupSizes[i]) {
                    const groupPoints = Math.ceil(
                        this._rankXpParams.top10.WRPoints * this._rankXpParams.groups.groupPointPcts[i]
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

    private generateLevelsArrays() {
        this.xpInLevels = [0];
        this.xpForLevels = [0, 0];

        for (let i = 1; i < this._cosXpParams.levels.maxLevels; i++) {
            this.xpInLevels[i] = this.getCosmeticXpInLevel(i);

            if (i > 1) this.xpForLevels[i] = this.xpForLevels[i - 1] + this.xpInLevels[i - 1];
        }
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
