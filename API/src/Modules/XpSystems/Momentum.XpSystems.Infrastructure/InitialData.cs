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
                    RankPercentages = new[] { 1.0, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43 }
                },
                Formula = new Formula
                {
                    A = 50000,
                    B = 49
                },
                Groups = new Groups
                {
                    MaxGroups = 4,
                    GroupScaleFactors = new[] { 1.0, 1.5, 2, 2.5 },
                    GroupExponents = new[] { 0.5, 0.56, 0.62, 0.68 },
                    GroupMinimumSizes = new[] { 10, 45, 125, 250 },
                    GroupPointPercentages = new[] { 0.2, 0.13, 0.07, 0.03 }
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
                    LinearScaleIntervalMultiplier = 1.0,
                    StaticScaleStart = 101,
                    StaticScaleBaseMultiplier = 1.5,
                    StaticScaleInterval = 25,
                    StaticScaleIntervalMultiplier = 0.5
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
