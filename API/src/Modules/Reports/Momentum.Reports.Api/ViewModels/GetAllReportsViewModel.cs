using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class GetAllReportsViewModel
    {
        [JsonPropertyName("count")]
        public int? Count { get; set; }
        [JsonPropertyName("reports")]
        public List<ReportViewModel> Reports { get; set; }
    }
}
