using System;
using System.Text.Json.Serialization;
using Momentum.Maps.Core.Models;

namespace Momentum.Maps.Api.ViewModels
{
    public class GetAllMapsParameters
    {
        /// <summary>
        /// Comma separated values: "credits", "thumbnail", "submitter"
        /// </summary>
        [JsonPropertyName("expand")]
        public string Expand { get; set; } = null;
        [JsonPropertyName("limit")]
        public uint? Limit { get; set; }
        [JsonPropertyName("offset")]
        public uint? Offset { get; set; }
        [JsonPropertyName("submitterID")]
        public Guid? SubmitterId { get; set; }
        [JsonPropertyName("search")]
        public string Search { get; set; }
        [JsonPropertyName("type")]
        public GameMode GameMode { get; set; }
        [JsonPropertyName("status")]
        public string Status { get; set; }
        [JsonPropertyName("statusNot")]
        public string NotStatus { get; set; }
    }
}