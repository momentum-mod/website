using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Cosmetic
{
    public class UniqueViewModel
    {
        [JsonPropertyName("tierScale")]
        public UniqueTierScaleViewModel TierScale { get; set; }
    }
}