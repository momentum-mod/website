using System.Text.Json.Serialization;
using Newtonsoft.Json.Linq;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public JObject RankXp { get; set; }

        [JsonPropertyName("cosXp")]
        public JObject CosmeticXp { get; set; }
    }
}
