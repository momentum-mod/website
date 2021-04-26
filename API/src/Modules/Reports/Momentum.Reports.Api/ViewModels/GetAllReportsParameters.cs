using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class GetAllReportsParameters
    {
        [JsonPropertyName("expand")]
        public string Expand { get; set; }
        [JsonPropertyName("limit")]
        public int? Limit { get; set; }
        [JsonPropertyName("offset")]
        public uint Offset { get; set; }
        [JsonPropertyName("resolved")]
        public bool Resolved { get; set; }
    }
}
