using System;

namespace Momentum.Auth.Core.Models
{
    public class UserAccessToken
    {
        public Guid UserId { get; set; }
        public string AccessToken { get; set; }
    }
}