using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    public class RepeatViewModel
    {
        [JsonPropertyName("tierScale")]
        public RepeatTierScaleViewModel TierScale { get; set; }
    }
}