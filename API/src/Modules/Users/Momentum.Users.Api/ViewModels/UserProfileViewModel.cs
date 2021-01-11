using System;
using System.Text.Json.Serialization;

namespace Momentum.Users.Api.ViewModels
{
    public class UserProfileViewModel
    {
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }
        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [JsonPropertyName("id")]
        public Guid UserId { get; set; }

        [JsonPropertyName("bio")]
        public string Bio { get; set; }
        [JsonPropertyName("featuredBadgeID")]
        public Guid FeaturedBadgeId { get; set; }

        [JsonPropertyName("discordAuth")]
        public UserDiscordAuthViewModel DiscordAuth { get; set; }
        [JsonPropertyName("twitchAuth")]
        public UserTwitchAuthViewModel TwitchAuth { get; set; }
        [JsonPropertyName("twitterAuth")]
        public UserTwitterAuthViewModel TwitterAuth { get; set; }
    }
}