using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public RankXP RankXP { get; set; }

        [JsonPropertyName("cosXP")]
        public CosXP CosXP { get; set; }
    }

    public class Top10
    {
        public int WRPoints { get; set; }
        public List<double> RankPercentages { get; set; }
    }

    public class Formula
    {
        public int A { get; set; }
        public int B { get; set; }
    }

    public class Groups
    {
        public int MaxGroups { get; set; }
        public List<double> GroupScaleFactors { get; set; }
        public List<double> GroupExponents { get; set; }
        public List<int> GroupMinSizes { get; set; }
        public List<double> GroupPointPcts { get; set; }
    }

    public class RankXP
    {
        public Top10 Top10 { get; set; }
        public Formula Formula { get; set; }
        public Groups Groups { get; set; }
    }

    public class Levels
    {
        public int MaxLevels { get; set; }
        public int StartingValue { get; set; }
        public int LinearScaleBaseIncrease { get; set; }
        public int LinearScaleInterval { get; set; }
        public double LinearScaleIntervalMultiplier { get; set; }
        public int StaticScaleStart { get; set; }
        public double StaticScaleBaseMultiplier { get; set; }
        public int StaticScaleInterval { get; set; }
        public double StaticScaleIntervalMultiplier { get; set; }
    }

    public class TierScale
    {
        public int Linear { get; set; }
        public int Staged { get; set; }
        public int? Stages { get; set; }
        public int? Bonus { get; set; }
    }

    public class Unique
    {
        public TierScale TierScale { get; set; }
    }

    public class Repeat
    {
        public TierScale TierScale { get; set; }
    }

    public class Completions
    {
        public Unique Unique { get; set; }
        public Repeat Repeat { get; set; }
    }

    public class CosXP
    {
        public Levels Levels { get; set; }
        public Completions Completions { get; set; }
    }
}
