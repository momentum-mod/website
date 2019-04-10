'use strict';

module.exports = (sequelize, type) => {
	return sequelize.define('xpSystems', {
		rankXP: {
			type: type.JSON,
			defaultValue: JSON.stringify({
				top10: {
					WRPoints: 3000,
					rankPercentages: [
						1,
						.75,
						.68,
						.61,
						.57,
						.53,
						.505,
						.48,
						.455,
						.43,
					],
				},
				formula: {
					A: 50000,
					B: 49,
				},
				groups: {
					maxGroups: 4,
					groupScaleFactors: [
						1,
						1.5,
						2,
						2.5
					],
					groupExponents: [
						0.5,
						0.56,
						0.62,
						0.68
					],
					groupMinSizes: [
						10,
						45,
						125,
						250
					],
					groupPointPcts: [ // How much, of a % of WRPoints, does each group get
						0.2,
						0.13,
						0.07,
						0.03,
					],
				},
			}),
		},
		cosXP: {
			type: type.JSON,
			defaultValue: JSON.stringify({
				todo: 'implement me',
			}),
		},
	})
};