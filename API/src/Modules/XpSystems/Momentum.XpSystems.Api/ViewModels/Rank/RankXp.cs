using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class RankXp
    {
        [JsonPropertyName("top10")]
        public Top10 Top10 { get; set; }
        [JsonPropertyName("formula")]
        public Formula Formula { get; set; }
        [JsonPropertyName("groups")]
        public Groups Groups { get; set; }
    }
}