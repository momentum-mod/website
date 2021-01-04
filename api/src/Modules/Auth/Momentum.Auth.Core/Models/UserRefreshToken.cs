using System;

namespace Momentum.Auth.Core.Models
{
    public class UserRefreshToken
    {
        public Guid UserId { get; set; }
        public string RefreshToken { get; set; }
    }
}