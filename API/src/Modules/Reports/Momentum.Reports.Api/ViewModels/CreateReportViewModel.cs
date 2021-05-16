using Momentum.Reports.Application.DTOs;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class CreateReportViewModel
    {
        [JsonPropertyName("data")]
        public string Data { get; set; }
        /// <summary>
        /// USER_PROFILE_REPORT: 0, MAP_REPORT: 1, MAP_COMMENT_REPORT: 2,
        /// </summary>
        [JsonPropertyName("type")]
        public ReportTypeDto Type { get; set; }
        /// <summary>
        /// INAPPROPRIATE_CONTENT: 1, PLAGIARSIM: 2, SPAM: 3, OTHER: 0,
        /// </summary>
        [JsonPropertyName("category")]
        public ReportCategoryDto Category { get; set; }
        [JsonPropertyName("message")]
        [StringLength(1000)]
        public string Message { get; set; }
    }
}
