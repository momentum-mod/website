using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Users.Core.Models.Auth
{
    public class UserRefreshToken : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public string RefreshToken { get; set; }
    }
}