using System.Text.Json.Serialization;
using Momentum.XpSystems.Core.Models.Cosmetic;
using Momentum.XpSystems.Core.Models.Rank;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public RankXp RankXP { get; set; }

        [JsonPropertyName("cosXP")]
        public CosmeticXp CosXP { get; set; }
    }
}
