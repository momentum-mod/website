using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Auth.Core.Models
{
    public class UserTwitter : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public string DisplayName { get; set; }
        public string OAuthKey { get; set; }
        public string OAuthSecret { get; set; }
    }
}