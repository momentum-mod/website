using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Momentum.Reports.Api.ViewModels
{
    public class ReportViewModel
    {
        [JsonPropertyName("id")]
        public Guid Id { get; set; }
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
        public string Data { get; set; }
        public ushort Type { get; set; }
        public uint Category { get; set; }
        [StringLength(1000)]
        public string Messgae { get; set; }
        public bool Resolved { get; set; }
        [StringLength(1000)]
        public string ResolutionMessage { get; set; }
    }
}
