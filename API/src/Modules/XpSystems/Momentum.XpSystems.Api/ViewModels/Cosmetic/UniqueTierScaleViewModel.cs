using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    /// <summary>
    /// Tier scale for unique completions
    /// </summary>
    public class UniqueTierScaleViewModel
    {
        [JsonPropertyName("linear")]
        public int Linear { get; set; }
        [JsonPropertyName("staged")]
        public int Staged { get; set; }
    }
}