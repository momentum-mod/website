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
            using var session = store.QuerySession();

            var xpSystem = await session.Query<XpSystem>().SingleOrDefaultAsync();

            if (xpSystem != null)
            {
                return;
            }
            else
            {
                using var session2 = store.LightweightSession();

                session2.Store(_initialData);

                session2.SaveChanges();
            }
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
                    RankPercentages = new[] { 1.0f, 0.75f, 0.68f, 0.61f, 0.57f, 0.53f, 0.505f, 0.48f, 0.455f, 0.43f }
                },
                Formula = new Formula
                {
                    A = 50000,
                    B = 49
                },
                Groups = new Groups
                {
                    MaxGroups = 4,
                    GroupScaleFactors = new[] { 1.0f, 1.5f, 2f, 2.5f },
                    GroupExponents = new[] { 0.5f, 0.56f, 0.62f, 0.68f },
                    GroupMinimumSizes = new[] { 10, 45, 125, 250 },
                    GroupPointPercentages = new[] { 0.2f, 0.13f, 0.07f, 0.03f }
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
                    LinearScaleIntervalMultiplier = 1.0f,
                    StaticScaleStart = 101,
                    StaticScaleBaseMultiplier = 1.5f,
                    StaticScaleInterval = 25,
                    StaticScaleIntervalMultiplier = 0.5f
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
