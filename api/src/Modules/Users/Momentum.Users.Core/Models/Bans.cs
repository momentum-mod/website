using System;

namespace Momentum.Users.Core.Models
{
    [Flags]
    public enum Bans
    {
        BannedLeaderboards = 1 << 0,
        BannedAlias = 1 << 1,
        BannedAvatar = 1 << 2,
        BannedBio = 1 << 3
    }
}