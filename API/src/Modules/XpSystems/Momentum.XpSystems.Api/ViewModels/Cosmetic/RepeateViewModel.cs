using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class RepeateViewModel
    {
        [JsonPropertyName("tierScale")]
        public RepeatTierScaleViewModel TierScale { get; set; }
    }
}