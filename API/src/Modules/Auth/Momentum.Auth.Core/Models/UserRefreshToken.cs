using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Auth.Core.Models
{
    public class UserRefreshToken : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public string RefreshToken { get; set; }
    }
}