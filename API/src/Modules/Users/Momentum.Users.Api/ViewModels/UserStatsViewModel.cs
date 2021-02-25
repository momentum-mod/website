using System;
using System.Text.Json.Serialization;

namespace Momentum.Users.Api.ViewModels
{
    public class UserStatsViewModel
    {
        [JsonPropertyName("userID")]
        public Guid UserId { get; set; }
        [JsonPropertyName("totalJumps")]
        public ulong TotalJumps { get; set; }
        [JsonPropertyName("totalStrafes")]
        public ulong TotalStrafes { get; set; }
        [JsonPropertyName("level")]
        public ushort Level { get; set; } = 1;
        [JsonPropertyName("cosXP")]
        public ulong CosmeticXp { get; set; }
        [JsonPropertyName("mapsCompleted")]
        public uint MapsCompleted { get; set; }
        [JsonPropertyName("runsSubmitted")]
        public uint RunsSubmitted { get; set; }
    }
}