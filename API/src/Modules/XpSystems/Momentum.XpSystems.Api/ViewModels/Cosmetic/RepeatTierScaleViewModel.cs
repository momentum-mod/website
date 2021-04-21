using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    /// <summary>
    /// Tier scale for repeat completions
    /// </summary>
    public class RepeatTierScaleViewModel
    {
        [JsonPropertyName("linear")]
        public int Linear { get; set; }
        [JsonPropertyName("staged")]
        public int Staged { get; set; }
        [JsonPropertyName("stages")]
        public int Stages { get; set; }
        [JsonPropertyName("bonus")]
        public int Bonus { get; set; }
    }
}