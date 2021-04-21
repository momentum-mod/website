using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    public class CosmeticXpViewModel
    {
        [JsonPropertyName("levels")]
        public LevelsViewModel Levels { get; set; }
        [JsonPropertyName("completions")]
        public CompletionsViewModel Completions { get; set; }
    }
}