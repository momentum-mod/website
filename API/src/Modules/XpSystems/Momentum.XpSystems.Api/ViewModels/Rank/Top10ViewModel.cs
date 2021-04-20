using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels.Rank
{
    public class Top10ViewModel
    {
        [JsonPropertyName("WRPoints")]
        public int WorldRecordPoints { get; set; }
        [JsonPropertyName("rankPercentages")]
        public float[] RankPercentages { get; set; }
    }
}