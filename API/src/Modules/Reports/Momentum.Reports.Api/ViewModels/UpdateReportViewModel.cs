using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class UpdateReportViewModel
    {
        [JsonPropertyName("resolved")]
        public bool Resolved { get; set; }
        [JsonPropertyName("resolutionMessage")]
        [StringLength(1000)]
        public string ResolutionMessage { get; set; }
    }
}
