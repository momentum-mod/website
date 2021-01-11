using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Auth.Core.Models
{
    public class UserDiscord : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public ulong DiscordId { get; set; }
        public string DisplayName { get; set; }
    }
}