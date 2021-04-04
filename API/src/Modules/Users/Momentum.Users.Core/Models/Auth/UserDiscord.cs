using System;
using Momentum.Framework.Core.Models;

namespace Momentum.Users.Core.Models.Auth
{
    public class UserDiscord : TimeTrackedModel
    {
        public Guid UserId { get; set; }
        public ulong DiscordId { get; set; }
        public string DisplayName { get; set; }
    }
}