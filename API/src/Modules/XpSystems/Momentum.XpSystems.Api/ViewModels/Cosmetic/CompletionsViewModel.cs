using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class CompletionsViewModel
    {
        [JsonPropertyName("unique")]
        public UniqueViewModel Unique { get; set; }
        [JsonPropertyName("repeat")]
        public RepeateViewModel Repeat { get; set; }
    }
}