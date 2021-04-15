using System;
using Momentum.Framework.Core.Models;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public dynamic RankXP { get; set; } = @"[
        {
		'rankXP': {
			'top10': {
				'WRPoints': 3000,
				'rankPercentages': [
					1,
					0.75,
					0.68,
					0.61,
					0.57,
					0.53,
					0.505,
					0.48,
					0.455,
					0.43
				]
			},
			'formula': {
				'A': 50000,
				'B': 49
			},
			'groups': {
				'maxGroups': 4,
				'groupScaleFactors': [
					1,
					1.5,
					2,
					2.5
				],
				'groupExponents': [
					0.5,
					0.56,
					0.62,
					0.68
				],
				'groupMinSizes': [
					10,
					45,
					125,
					250
				],
				'groupPointPcts': [
					0.2,
					0.13,
					0.07,
					0.03
				]}
			},
		}
        ]";

		public dynamic CosmeticXP { get; set; } = @"[
        {
		'cosXP': {
			'levels': {
				'maxLevels': 500,
				'startingValue': 20000,
				'linearScaleBaseIncrease': 1000,
				'linearScaleInterval': 10,
				'linearScaleIntervalMultiplier': 1.0,
				'staticScaleStart': 101,
				'staticScaleBaseMultiplier': 1.5,
				'staticScaleInterval': 25,
				'staticScaleIntervalMultiplier': 0.5
			},
				'completions': {
					'unique': {
						'tierScale': {
							'linear': 2500,
							'staged': 2500
						}
					},
					'repeat': {
						'tierScale': {
							'linear': 20,
							'staged': 40,
							'stages': 5,
							'bonus': 40
						}
					}
				}
			}
		}
        ]";
	}
}
