using System;
using System.Collections.Generic;
using Momentum.Framework.Core.Models;

namespace Momentum.XpSystems.Core.Models
{
    public class XpSystem : TimeTrackedModel
    {
        public Guid Id { get; set; }
		public RankXP RankXP { get; set; }
		public CosXP CosmeticXP { get; set; }
	}

    public class RankXP
    {
        public Top10 Top10 { get; set; }
        public Formula Formula { get; set; }
        public Groups Groups { get; set; }
    }

    public class Top10
    {
        public int WRPoints { get; set; }
        public float[] RankPercentages { get; set; }
    }

    public class Formula
    {
        public int A { get; set; }
        public int B { get; set; }
    }

    public class Groups
    {
        public int MaxGroups { get; set; }
        public float[] GroupScaleFactors { get; set; }
        public float[] GroupExponents { get; set; }
        public int[] GroupMinSizes { get; set; }
        public float[] GroupPointPcts { get; set; }
    }
    public class Levels
    {
        public int MaxLevels { get; set; }
        public int StartingValue { get; set; }
        public int LinearScaleBaseIncrease { get; set; }
        public int LinearScaleInterval { get; set; }
        public float LinearScaleIntervalMultiplier { get; set; }
        public int StaticScaleStart { get; set; }
        public float StaticScaleBaseMultiplier { get; set; }
        public int StaticScaleInterval { get; set; }
        public float StaticScaleIntervalMultiplier { get; set; }
    }

    public class Completions
    {
        public Unique Unique { get; set; }
        public Repeat Repeat { get; set; }
    }

    public class Unique
    {
        public Tierscale TierScale { get; set; }
    }

    public class Tierscale
    {
        public int Linear { get; set; }
        public int Staged { get; set; }
    }

    public class Repeat
    {
        public Tierscale1 TierScale { get; set; }
    }

    public class Tierscale1
    {
        public int Linear { get; set; }
        public int Staged { get; set; }
        public int Stages { get; set; }
        public int Bonus { get; set; }
    }

    public class CosXP
    {
        public Levels Levels { get; set; }
        public Completions Completions { get; set; }
    }
}
