using Marten;
using Marten.Schema;
using Momentum.XpSystems.Core.Models;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Momentum.XpSystems.Infrastructure
{
    public class InitialData : IInitialData
    {
		private readonly object _initialData;

		public InitialData(object initialData)
        {
			_initialData = initialData;
        }
        public void Populate(IDocumentStore store)
        {
            using var session = store.LightweightSession();
            session.Store(_initialData);
            session.SaveChanges();
        }
    }

    public static class InitialDataSets
    {
        public static readonly XpSystem XpSystem = new XpSystem
        {
            RankXP = JObject.Parse(@"{
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
			}"),
			CosmeticXP = JObject.Parse(@"{
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
			}")
		};
    }        
}
