using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class GetAllReportsViewModel
    {
        [JsonPropertyName("number")]
        public int? Number { get; set; }
        [JsonPropertyName("reports")]
        public List<ReportViewModel> Reports { get; set; }
    }
}
