'use strict';
const ServerError = require('../helpers/server-error');

let rankXPParams = null;
let cosXPParams = null;
let xpSystems = null;
let XP_IN_LEVELS = [];
let XP_FOR_LEVELS = [];

const getInitialScale = (tier, type = 0) => {
	switch(type) {
		case 0:
		default:
			return (Math.pow(tier, 2) - tier) + 10;
		case 1:
			return Math.pow(tier, 2);
		case 2:
			return Math.pow(tier, 2) + 5;
	}
};

module.exports = {
	initXPSystems: (mdl) => {
		return mdl.findOrCreate({
			where: {id: 1}
		}).then(([systems, created]) => {
			rankXPParams = JSON.parse(systems.rankXP);
			cosXPParams = JSON.parse(systems.cosXP);
			xpSystems = systems;

			// Levels stuff
			module.exports.generateLevelsArrays();

			return Promise.resolve();
		});
	},

	generateLevelsArrays: () => {
		XP_IN_LEVELS = [0];
		XP_FOR_LEVELS = [0, 0];
		for (let i = 1; i < cosXPParams.levels.maxLevels; i++)
		{
			XP_IN_LEVELS[i] = module.exports.getCosmeticXPInLevel(i);
			if (i > 1)
				XP_FOR_LEVELS[i] = XP_FOR_LEVELS[i - 1] + XP_IN_LEVELS[i - 1];
		}
	},

	getCosmeticXPInLevel: (level) => {
		if (!xpSystems || level < 1 || level > cosXPParams.levels.maxLevels)
			return -1;
		if (level < cosXPParams.levels.staticScaleStart) {
			return cosXPParams.levels.startingValue +
				cosXPParams.levels.linearScaleBaseIncrease * level * (cosXPParams.levels.linearScaleIntervalMultiplier * Math.ceil(level / cosXPParams.levels.linearScaleInterval))
		} else {
			return cosXPParams.levels.linearScaleBaseIncrease * (cosXPParams.levels.staticScaleStart - 1) * (cosXPParams.levels.linearScaleIntervalMultiplier * Math.ceil((cosXPParams.levels.staticScaleStart - 1) / cosXPParams.levels.linearScaleInterval)) *
				(level >= cosXPParams.levels.staticScaleStart + cosXPParams.levels.staticScaleInterval ? cosXPParams.levels.staticScaleBaseMultiplier + Math.floor((level - cosXPParams.levels.staticScaleStart) / cosXPParams.levels.staticScaleInterval) * cosXPParams.levels.staticScaleIntervalMultiplier : cosXPParams.levels.staticScaleBaseMultiplier)
		}
	},

	getCosmeticXPForLevel: (level) => {
		if (!xpSystems || level < 1 || level > cosXPParams.levels.maxLevels)
			return -1;
		return XP_FOR_LEVELS[level];
	},

	/**
	 * @param inputs {{tier: number, isLinear: boolean, isBonus: boolean, isUnique: boolean, isStageIL: boolean}}
	 *         tier -- difficulty of the track
	 *         isLinear -- if the track is linear
	 *         isBonus -- if the track is a bonus
	 *         isUnique -- if the completion is a unique one
	 *         isStageIL -- if the calculation is for a specific stage in a track
	 * @return number The cosmetic XP gained from this completion
	 */
	getCosmeticXPForCompletion: (inputs) => {
		let xp = 0;
		const initialScale = getInitialScale(inputs.tier);

		if (inputs.isBonus) {
			// TODO this needs to probably change (0.9.0+)
			const baseBonus = Math.ceil((cosXPParams.completions.unique.tierScale.linear * getInitialScale(3) + cosXPParams.completions.unique.tierScale.linear * getInitialScale(4)) / 2);
			xp = inputs.isUnique ? baseBonus : Math.ceil(baseBonus / cosXPParams.completions.repeat.tierScale.bonus);
		}
		else {
			const baseXP = (inputs.isLinear ? cosXPParams.completions.unique.tierScale.linear : cosXPParams.completions.unique.tierScale.staged) * initialScale;
			if (inputs.isStageIL) {
				// Unique counts as a repeat
				xp = Math.ceil((baseXP / cosXPParams.completions.repeat.tierScale.staged) / cosXPParams.completions.repeat.tierScale.stages);
			}
			else {
				xp = inputs.isUnique ? baseXP : Math.ceil(baseXP / (inputs.isLinear ? cosXPParams.completions.repeat.tierScale.linear : cosXPParams.completions.repeat.tierScale.staged));
			}
		}

		return xp;
	},

	/**
	 * @param rank The rank of the user
	 * @param completions The amount of completions for this category
	 * @returns {{top10: number, rankXP: number, formula: number, group: {groupXP: number, groupNum: number}}}
	 */
	getRankXPForRank: (rank, completions) => {
		let rankObj = {
			rankXP: 0, // The total XP gained
			group: {
				groupXP: 0, // The XP gained from group calculation
				groupNum: -1, // and what group they're in (groupNum)
			},
			formula: 0, // The XP gained from formula points
			top10: 0, // The XP gained from Top10 points
		};

		// Regardless of run, we want to calculate formula points
		const formulaPoints = Math.ceil(rankXPParams.formula.A / (rank + rankXPParams.formula.B));
		rankObj.formula = formulaPoints;
		rankObj.rankXP += formulaPoints;

		// Calculate Top10 points if in there
		if (rank < 11) {
			const top10Points = Math.ceil(rankXPParams.top10.rankPercentages[rank - 1] * rankXPParams.top10.WRPoints);
			rankObj.top10 = top10Points;
			rankObj.rankXP += top10Points;
		} else {
			// Otherwise we calculate group points depending on group location

			// Going to have to calculate groupSizes dynamically
			const groupSizes = [];
			for (let i = 0; i < rankXPParams.groups.maxGroups; i++) {
				groupSizes[i] = Math.max(rankXPParams.groups.groupScaleFactors[i] * Math.pow(completions, rankXPParams.groups.groupExponents[i]), rankXPParams.groups.groupMinSizes[i]);
			}

			let rankOffset = 11;
			for (let i = 0; i < rankXPParams.groups.maxGroups; i++) {
				if (rank < rankOffset + groupSizes[i]) {
					const groupPoints = Math.ceil(rankXPParams.top10.WRPoints * rankXPParams.groups.groupPointPcts[i]);
					rankObj.group.groupNum = i + 1;
					rankObj.group.groupXP = groupPoints;
					rankObj.rankXP += groupPoints;
					break;
				} else {
					rankOffset += groupSizes[i];
				}
			}
		}

		return rankObj;
	},

	getXPSystems: () => {
		if (!xpSystems)
			return Promise.reject(new ServerError(404, 'XP Systems not found.'));
		return Promise.resolve(xpSystems);
	},

	updateXPSystems: (systemsObj) => {
		if (!xpSystems)
			return Promise.reject(new ServerError(404, 'XP Systems not found.'));
		return xpSystems.update(systemsObj);
	},

};
