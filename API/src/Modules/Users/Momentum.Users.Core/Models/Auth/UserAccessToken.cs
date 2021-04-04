using System;

namespace Momentum.Users.Core.Models.Auth
{
    public class UserAccessToken
    {
        public Guid UserId { get; set; }
        public string AccessToken { get; set; }
    }
}