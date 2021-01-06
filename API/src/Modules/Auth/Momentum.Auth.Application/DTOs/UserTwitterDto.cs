using System;

namespace Momentum.Auth.Application.DTOs
{
    public class UserTwitterDto
    {
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string DisplayName { get; set; }
        public string OAuthKey { get; set; }
        public string OAuthSecret { get; set; }
    }
}