using System;

namespace Momentum.Auth.Application.DTOs
{
    public class UserDiscordDto
    {
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public ulong DiscordId { get; set; }
        public string DisplayName { get; set; }
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
    }
}