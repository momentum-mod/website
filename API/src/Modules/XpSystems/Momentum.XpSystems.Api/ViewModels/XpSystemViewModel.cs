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
        public List<double> rankPercentages { get; set; }
    }

    public class Formula
    {
        public int A { get; set; }
        public int B { get; set; }
    }

    public class Groups
    {
        public int maxGroups { get; set; }
        public List<double> groupScaleFactors { get; set; }
        public List<double> groupExponents { get; set; }
        public List<int> groupMinSizes { get; set; }
        public List<double> groupPointPcts { get; set; }
    }

    public class RankXP
    {
        public Top10 top10 { get; set; }
        public Formula formula { get; set; }
        public Groups groups { get; set; }
    }

    public class Levels
    {
        public int maxLevels { get; set; }
        public int startingValue { get; set; }
        public int linearScaleBaseIncrease { get; set; }
        public int linearScaleInterval { get; set; }
        public double linearScaleIntervalMultiplier { get; set; }
        public int staticScaleStart { get; set; }
        public double staticScaleBaseMultiplier { get; set; }
        public int staticScaleInterval { get; set; }
        public double staticScaleIntervalMultiplier { get; set; }
    }

    public class TierScale
    {
        public int linear { get; set; }
        public int staged { get; set; }
        public int? stages { get; set; }
        public int? bonus { get; set; }
    }

    public class Unique
    {
        public TierScale tierScale { get; set; }
    }

    public class Repeat
    {
        public TierScale tierScale { get; set; }
    }

    public class Completions
    {
        public Unique unique { get; set; }
        public Repeat repeat { get; set; }
    }

    public class CosXP
    {
        public Levels levels { get; set; }
        public Completions completions { get; set; }
    }
}
