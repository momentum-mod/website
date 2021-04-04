using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Users.Core.Models.Auth
{
    public class UserTwitter : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public string DisplayName { get; set; }
    }
}