namespace Momentum.XpSystems.Application.DTOs.Cosmetic
{
    public class LevelsDto
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
}