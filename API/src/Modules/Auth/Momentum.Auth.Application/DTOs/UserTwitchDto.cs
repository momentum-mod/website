using System;

namespace Momentum.Auth.Application.DTOs
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