using Momentum.Reports.Application.DTOs;
using Momentum.Users.Api.ViewModels;
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class ReportViewModel
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }
        [JsonPropertyName("submitterId")]
        public Guid? SubmitterId { get; set; }
        [JsonPropertyName("resolverId")]
        public Guid? ResolverId { get; set; }
        [JsonPropertyName("submitter")]
        public UserViewModel? Submitter { get; set; }
        [JsonPropertyName("resolver")]
        public UserViewModel? Resolver { get; set; }
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
        [JsonPropertyName("data")]
        public string Data { get; set; }
        [JsonPropertyName("type")]
        public ReportTypeDto Type { get; set; }
        [JsonPropertyName("category")]
        public ReportCategoryDto Category { get; set; }
        [StringLength(1000)]
        [JsonPropertyName("message")]
        public string Message { get; set; }
        [JsonPropertyName("resolved")]
        public bool Resolved { get; set; }
        [JsonPropertyName("resolutionMessage")]
        [StringLength(1000)]
        public string ResolutionMessage { get; set; }
    }
}
