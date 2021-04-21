namespace Momentum.XpSystems.Core.Models.Cosmetic
{
    /// <summary>
    /// Tier scale for repeat completions
    /// </summary>
    public class RepeatTierScale
    {
        public int Linear { get; set; }
        public int Staged { get; set; }
        public int Stages { get; set; }
        public int Bonus { get; set; }
    }
}