using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    public class CompletionsViewModel
    {
        [JsonPropertyName("unique")]
        public UniqueViewModel Unique { get; set; }
        [JsonPropertyName("repeat")]
        public RepeatViewModel Repeat { get; set; }
    }
}