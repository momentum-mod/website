using System;

namespace Momentum.Auth.Core.Models
{
    public class UserRefreshToken
    {
        public Guid UserId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string RefreshToken { get; set; }
    }
}