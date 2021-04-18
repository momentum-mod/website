using Marten;
using Marten.Schema;
using Momentum.XpSystems.Core.Models;

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

    public class InitialDataSets
    {
        public readonly XpSystem XpSystem = new XpSystem
        {
            RankXP = new RankXP
            {
                Top10 = new Top10
                {
                    WRPoints = 3000,
                    RankPercentages = new float[] { 1.0f, 0.75f, 0.68f, 0.61f, 0.57f, 0.53f, 0.505f, 0.48f, 0.455f, 0.43f }
                },
                Formula = new Formula
                {
                    A = 50000,
                    B = 49
                },
                Groups = new Groups
                {
                    MaxGroups = 4,
                    GroupScaleFactors = new float[] { 1.0f, 1.5f, 2f, 2.5f },
                    GroupExponents = new float[] { 0.5f, 0.56f, 0.62f, 0.68f },
                    GroupMinSizes = new int[] { 10, 45, 125, 250 },
                    GroupPointPcts = new float[] { 0.2f, 0.13f, 0.07f, 0.03f }
                },
            },
            CosmeticXP = new CosmeticXP
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
                        TierScale = new Tierscale
                        {
                            Linear = 2500,
                            Staged = 2500
                        }
                    },
                    Repeat = new Repeat
                    {
                        TierScale = new Tierscale1
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
