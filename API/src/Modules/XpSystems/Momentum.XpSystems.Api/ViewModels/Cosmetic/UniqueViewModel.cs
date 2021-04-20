using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class UniqueViewModel
    {
        [JsonPropertyName("tierScale")]
        public UniqueTierScaleViewModel TierScale { get; set; }
    }
}