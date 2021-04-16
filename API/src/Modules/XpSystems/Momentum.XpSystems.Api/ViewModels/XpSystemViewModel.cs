using System.Text.Json.Serialization;
using Newtonsoft.Json.Linq;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class XpSystemViewModel
    {
        [JsonPropertyName("rankXP")]
        public JObject RankXP { get; set; }

        [JsonPropertyName("cosXP")]
        public JObject CosXP { get; set; }
    }
}
