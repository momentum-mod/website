using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Rank
{
    public class RankXpViewModel
    {
        [JsonPropertyName("top10")]
        public Top10ViewModel Top10 { get; set; }
        [JsonPropertyName("formula")]
        public FormulaViewModel Formula { get; set; }
        [JsonPropertyName("groups")]
        public GroupsViewModel Groups { get; set; }
    }
}