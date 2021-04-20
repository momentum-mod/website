using System.Text.Json.Serialization;
using Momentum.XpSystems.Api.ViewModels.Cosmetic;
using Momentum.XpSystems.Api.ViewModels.Rank;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public RankXpViewModel RankXp { get; set; }

        [JsonPropertyName("cosXP")]
        public CosmeticXpViewModel CosmeticXp { get; set; }
    }
}
