using Marten;
using Marten.Schema;
using Momentum.XpSystems.Core.Models;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;

namespace Momentum.XpSystems.Infrastructure
{
    public class InitialData : IInitialData
    {
        private readonly object _initialData;

        public InitialData(object initialData)
        {
            _initialData = initialData;
        }

        public async void Populate(IDocumentStore store)
        {
            using var session = store.LightweightSession();

            var xpSystem = await session.Query<XpSystem>().SingleOrDefaultAsync();

            if (xpSystem != null) return;

            session.Store(_initialData);

            session.SaveChanges();
        }
    }

    public class InitialDataSets
    {
        public readonly XpSystem XpSystem = new()
        {
            RankXp = new RankXp
            {
                Top10 = new Top10
                {
                    WorldRecordPoints = 3000,
                    RankPercentages = new[] { 1.0M, 0.75M, 0.68M, 0.61M, 0.57M, 0.53M, 0.505M, 0.48M, 0.455M, 0.43M }
                },
                Formula = new Formula
                {
                    A = 50000,
                    B = 49
                },
                Groups = new Groups
                {
                    MaxGroups = 4,
                    GroupScaleFactors = new[] { 1.0M, 1.5M, 2M, 2.5M },
                    GroupExponents = new[] { 0.5M, 0.56M, 0.62M, 0.68M },
                    GroupMinimumSizes = new[] { 10, 45, 125, 250 },
                    GroupPointPercentages = new[] { 0.2M, 0.13M, 0.07M, 0.03M }
                },
            },
            CosmeticXp = new CosmeticXp
            {
                Levels = new Levels
                {
                    MaxLevels = 500,
                    StartingValue = 20000,
                    LinearScaleBaseIncrease = 1000,
                    LinearScaleInterval = 10,
                    LinearScaleIntervalMultiplier = 1.0M,
                    StaticScaleStart = 101,
                    StaticScaleBaseMultiplier = 1.5M,
                    StaticScaleInterval = 25,
                    StaticScaleIntervalMultiplier = 0.5M
                },
                Completions = new Completions
                {
                    Unique = new Unique
                    {
                        TierScale = new UniqueTierScale
                        {
                            Linear = 2500,
                            Staged = 2500
                        }
                    },
                    Repeat = new Repeat
                    {
                        TierScale = new RepeatTierScale
                        {
                            Linear = 20,
                            Staged = 40,
                            Stages = 5,
                            Bonus = 40
                        }
                    }
                }
            }
        };
    }
}
