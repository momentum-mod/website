using Momentum.XpSystems.Core.Models;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public RankXP RankXP { get; set; }

        [JsonPropertyName("cosXP")]
        public CosXP CosXP { get; set; }
    }
}
