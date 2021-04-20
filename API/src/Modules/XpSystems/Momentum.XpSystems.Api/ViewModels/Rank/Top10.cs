using System.Text.Json.Serialization;

namespace Momentum.XpSystems.Api.ViewModels
{
    public class Top10
    {
        [JsonPropertyName("WRPoints")]
        public int WorldRecordPoints { get; set; }
        [JsonPropertyName("rankPercentages")]
        public float[] RankPercentages { get; set; }
    }
}