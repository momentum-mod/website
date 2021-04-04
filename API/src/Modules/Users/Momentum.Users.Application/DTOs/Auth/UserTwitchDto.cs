using System;

namespace Momentum.Users.Application.DTOs.Auth
{
    public class UserTwitchDto
    {
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int TwitchId { get; set; }
        public string DisplayName { get; set; }
    }
}