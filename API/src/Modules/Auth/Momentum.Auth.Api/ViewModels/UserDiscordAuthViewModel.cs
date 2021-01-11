using System;
using System.Text.Json.Serialization;

namespace Momentum.Auth.Api.ViewModels
{
    public class UserDiscordAuthViewModel
    {
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("id")]
        public Guid UserId { get; set; }
        
        [JsonPropertyName("discordID")]
        public ulong DiscordId { get; set; }
        [JsonPropertyName("displayName")]
        public string DisplayName { get; set; }
    }
}