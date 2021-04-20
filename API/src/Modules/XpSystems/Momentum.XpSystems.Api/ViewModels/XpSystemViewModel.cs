using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public RankXp RankXp { get; set; }

        [JsonPropertyName("cosXP")]
        public CosmeticXpViewModel CosXp { get; set; }
    }
}
