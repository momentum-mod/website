using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public dynamic RankXp { get; set; }

        [JsonPropertyName("cosXp")]
        public dynamic CosmeticXp { get; set; }
    }
}
