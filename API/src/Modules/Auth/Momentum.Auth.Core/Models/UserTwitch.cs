using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Auth.Core.Models
{
    public class UserTwitch : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public int TwitchId { get; set; }
        public string DisplayName { get; set; }
    }
}